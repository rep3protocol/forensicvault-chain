import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  anchorAlerts,
  caseReadinessAlerts,
  custodyAlerts,
  duplicateAlerts,
  evidenceAlerts,
  ledgerAlerts,
  signatureReadinessAlerts,
  tamperBackupAlerts,
} from "@/lib/shield/rules";
import { getAnchorHistorySummary } from "@/lib/anchors/history";
import { getCaseReadinessSummaries } from "@/lib/cases/readiness";
import { getSignatureReadinessForEvents } from "@/lib/custody/signatureReadiness";
import { compareSeverity } from "@/lib/shield/severity";
import {
  computeRawShieldStatus,
  computeShieldStatus,
  countAlertsBySeverity,
  getRecommendedActions,
} from "@/lib/shield/summary";
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
    anchorHistorySummary,
    caseReadinessSummaries,
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
            publicKey: true,
            signature: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    countTamperBackupFiles(),
    getAnchorHistorySummary(),
    getCaseReadinessSummaries(),
  ]);

  const duplicateGroups = getDuplicateGroups(evidenceItems);
  const signatureReadiness = getSignatureReadinessForEvents(
    evidenceItems.flatMap((evidence) => evidence.custodyEvents),
  );
  const signatureReadinessWarningCount =
    signatureReadiness.status === "WARNING"
      ? signatureReadiness.missingSignatureCount +
        signatureReadiness.placeholderPublicKeyCount
      : 0;
  const casesWithReadinessWarnings = caseReadinessSummaries.filter(
    (caseItem) => caseItem.warningCount > 0 || caseItem.failCount > 0,
  );
  const rawAlerts = [
    ...ledgerAlerts(ledgerValidation.valid, ledgerValidation.errors),
    ...evidenceAlerts(evidenceItems),
    ...custodyAlerts(evidenceItems),
    ...duplicateAlerts(duplicateGroups),
    ...tamperBackupAlerts(tamperBackupFileCount),
    ...anchorAlerts({
      savedAnchorCount: anchorHistorySummary.savedAnchorCount,
      latestSavedAnchorHeight: anchorHistorySummary.latestSavedAnchorHeight,
      latestComparison: anchorHistorySummary.latestComparison,
      duplicateAnchorRecordGroupCount:
        anchorHistorySummary.duplicateAnchorRecordGroupCount,
    }),
    ...caseReadinessAlerts({
      warningCaseCount: casesWithReadinessWarnings.length,
      caseExamples: casesWithReadinessWarnings.slice(0, 3),
    }),
    ...signatureReadinessAlerts(signatureReadinessWarningCount),
  ].sort((a, b) => compareSeverity(a.severity, b.severity));
  const activeAlertIds = rawAlerts.map((alert) => alert.id);
  const [acknowledgements, recentEvents] = await Promise.all([
    activeAlertIds.length > 0
      ? prisma.shieldAlertAcknowledgement.findMany({
          where: { alertId: { in: activeAlertIds } },
        })
      : [],
    prisma.shieldEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const acknowledgementByAlertId = new Map(
    acknowledgements.map((acknowledgement) => [
      acknowledgement.alertId,
      {
        alertId: acknowledgement.alertId,
        note: acknowledgement.note,
        acknowledgedById: acknowledgement.acknowledgedById,
        acknowledgedByName: acknowledgement.acknowledgedByName,
        acknowledgedAt: acknowledgement.acknowledgedAt,
      },
    ]),
  );
  const alerts = rawAlerts
    .map((alert) => ({
      ...alert,
      acknowledgement: acknowledgementByAlertId.get(alert.id),
    }))
    .sort((a, b) => compareSeverity(a.severity, b.severity));
  const acknowledgedAlerts = alerts.filter((alert) => alert.acknowledgement);
  const unacknowledgedAlerts = alerts.filter((alert) => !alert.acknowledgement);
  const unacknowledgedCounts = countAlertsBySeverity(unacknowledgedAlerts);

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
    acknowledgedAlertCount: acknowledgedAlerts.length,
    unacknowledgedCriticalAlerts: unacknowledgedCounts.CRITICAL,
    unacknowledgedHighAlerts: unacknowledgedCounts.HIGH,
    unacknowledgedMediumAlerts: unacknowledgedCounts.MEDIUM,
    unacknowledgedLowAlerts: unacknowledgedCounts.LOW,
    savedAnchorCount: anchorHistorySummary.savedAnchorCount,
    latestSavedAnchorHeight: anchorHistorySummary.latestSavedAnchorHeight,
    latestAnchorMatchesCurrent: anchorHistorySummary.latestAnchorMatchesCurrent,
    latestAnchorComparisonStatus: anchorHistorySummary.latestAnchorComparisonStatus,
    duplicateAnchorRecordGroups: anchorHistorySummary.duplicateAnchorRecordGroupCount,
    caseReadinessWarningCount: casesWithReadinessWarnings.length,
    signatureReadinessWarningCount,
  };
  const status = computeShieldStatus(unacknowledgedAlerts);
  const rawStatus = computeRawShieldStatus(alerts);

  return {
    generatedAt: new Date(),
    status,
    rawStatus,
    metrics,
    alerts,
    acknowledgedAlerts,
    unacknowledgedAlerts,
    recentEvents: recentEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      alertId: event.alertId,
      severity: event.severity,
      category: event.category,
      title: event.title,
      description: event.description,
      actorName: event.actorName,
      createdAt: event.createdAt,
    })),
    duplicateGroups,
    ledgerErrors: ledgerValidation.errors,
    recommendedActions: getRecommendedActions(unacknowledgedAlerts, metrics, {
      hasAcknowledgedAlerts: acknowledgedAlerts.length > 0,
    }),
  };
}
