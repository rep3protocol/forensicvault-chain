import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  custodyAlerts,
  duplicateAlerts,
  evidenceAlerts,
  ledgerAlerts,
  tamperBackupAlerts,
} from "@/lib/shield/rules";
import { compareSeverity } from "@/lib/shield/severity";
import { computeShieldStatus, getRecommendedActions } from "@/lib/shield/summary";
import type { ShieldDuplicateGroup, ShieldScanResult } from "@/lib/shield/types";
import { validateLedgerChain } from "@/lib/ledgerValidation";
import { prisma } from "@/lib/prisma";

const TAMPER_BACKUP_DIR = path.join(process.cwd(), "storage", "tamper-test-backups");

async function countTamperBackupFiles() {
  try {
    const files = await readdir(TAMPER_BACKUP_DIR, { withFileTypes: true });
    return files.filter((file) => file.isFile()).length;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return 0;
    }

    throw error;
  }
}

function getDuplicateGroups(
  evidenceItems: {
    originalName: string;
    sha256Hash: string;
    case: { id: string; title: string };
  }[],
): ShieldDuplicateGroup[] {
  const byHash = new Map<
    string,
    {
      sha256Hash: string;
      evidenceNames: string[];
      cases: Map<string, string>;
    }
  >();

  for (const evidence of evidenceItems) {
    const group =
      byHash.get(evidence.sha256Hash) ??
      {
        sha256Hash: evidence.sha256Hash,
        evidenceNames: [],
        cases: new Map<string, string>(),
      };

    group.evidenceNames.push(evidence.originalName);
    group.cases.set(evidence.case.id, evidence.case.title);
    byHash.set(evidence.sha256Hash, group);
  }

  return [...byHash.values()]
    .filter((group) => group.evidenceNames.length > 1)
    .map((group) => ({
      sha256Hash: group.sha256Hash,
      itemCount: group.evidenceNames.length,
      caseCount: group.cases.size,
      caseTitles: [...group.cases.values()],
      evidenceNames: group.evidenceNames,
    }));
}

export async function scanShield(): Promise<ShieldScanResult> {
  const [
    ledgerValidation,
    latestBlock,
    totalLedgerBlocks,
    totalEvidenceItems,
    totalCases,
    totalCustodyEvents,
    totalVerifications,
    failedVerifications,
    evidenceItems,
    tamperBackupFileCount,
  ] = await Promise.all([
    validateLedgerChain(),
    prisma.ledgerBlock.findFirst({ orderBy: { height: "desc" } }),
    prisma.ledgerBlock.count(),
    prisma.evidenceItem.count(),
    prisma.case.count(),
    prisma.custodyEvent.count(),
    prisma.verification.count(),
    prisma.verification.count({ where: { matched: false } }),
    prisma.evidenceItem.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        registeredBlockHeight: true,
        registeredTxHash: true,
        sha256Hash: true,
        case: {
          select: {
            id: true,
            title: true,
          },
        },
        verifications: {
          select: {
            id: true,
            matched: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        custodyEvents: {
          select: {
            id: true,
            notes: true,
            previousEventHash: true,
            eventHash: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    countTamperBackupFiles(),
  ]);

  const duplicateGroups = getDuplicateGroups(evidenceItems);
  const alerts = [
    ...ledgerAlerts(ledgerValidation.valid, ledgerValidation.errors),
    ...evidenceAlerts(evidenceItems),
    ...custodyAlerts(evidenceItems),
    ...duplicateAlerts(duplicateGroups),
    ...tamperBackupAlerts(tamperBackupFileCount),
  ].sort((a, b) => compareSeverity(a.severity, b.severity));

  const metrics = {
    ledgerValid: ledgerValidation.valid,
    latestBlockHeight: latestBlock?.height ?? null,
    latestBlockHash: latestBlock?.blockHash ?? null,
    totalLedgerBlocks,
    totalEvidenceItems,
    totalCases,
    totalCustodyEvents,
    totalVerifications,
    failedVerifications,
    evidenceWithoutVerification: evidenceItems.filter(
      (evidence) => evidence.verifications.length === 0,
    ).length,
    duplicateHashGroups: duplicateGroups.length,
    crossCaseDuplicateHashGroups: duplicateGroups.filter((group) => group.caseCount > 1)
      .length,
    missingEvidenceRegistrationReferences: evidenceItems.filter(
      (evidence) =>
        evidence.registeredBlockHeight === null || !evidence.registeredTxHash?.trim(),
    ).length,
    custodyEventsWithMissingNotes: evidenceItems.reduce(
      (count, evidence) =>
        count +
        evidence.custodyEvents.filter((event) => !event.notes?.trim()).length,
      0,
    ),
    custodyEventsWithMissingHashReferences: evidenceItems.reduce(
      (count, evidence) =>
        count +
        evidence.custodyEvents.filter(
          (event) => !event.eventHash?.trim() || !event.previousEventHash?.trim(),
        ).length,
      0,
    ),
    tamperBackupFileCount,
  };
  const status = computeShieldStatus(alerts);

  return {
    generatedAt: new Date(),
    status,
    metrics,
    alerts,
    duplicateGroups,
    ledgerErrors: ledgerValidation.errors,
    recommendedActions: getRecommendedActions(alerts, metrics),
  };
}
