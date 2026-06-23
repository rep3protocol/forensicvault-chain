import type { LedgerTransaction } from "@prisma/client";
import { getDuplicateCountsByHashes } from "@/lib/evidence/duplicates";
import { prisma } from "@/lib/prisma";

export type CasePacketData = NonNullable<
  Awaited<ReturnType<typeof getCasePacketData>>
>;

type EvidenceReferencePayload = {
  evidenceId?: unknown;
  caseId?: unknown;
};

export function formatPacketDate(value?: Date | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(value);
}

export function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

export function custodyStatus(
  registeredTxHash: string | null,
  events: { previousEventHash: string | null; eventHash: string }[],
) {
  if (events.length === 0) return "No custody events recorded.";
  if (!registeredTxHash) return "Custody chain broken: missing registration transaction hash.";
  if (events[0].previousEventHash !== registeredTxHash) return "Custody chain broken.";

  for (let i = 1; i < events.length; i++) {
    if (events[i].previousEventHash !== events[i - 1].eventHash) {
      return "Custody chain broken.";
    }
  }

  return "Custody chain valid.";
}

function parsePayload(payloadJson: string): EvidenceReferencePayload | null {
  try {
    const parsed = JSON.parse(payloadJson) as EvidenceReferencePayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function isCaseRelatedTransaction(
  transaction: LedgerTransaction,
  caseId: string,
  evidenceIds: Set<string>,
) {
  const payload = parsePayload(transaction.payloadJson);
  if (!payload) return false;
  if (payload.caseId === caseId) return true;
  return typeof payload.evidenceId === "string" && evidenceIds.has(payload.evidenceId);
}

export async function getCasePacketData(caseId: string) {
  const caseItem = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      owner: true,
      evidence: {
        orderBy: { createdAt: "asc" },
        include: {
          custodyEvents: {
            orderBy: { createdAt: "asc" },
          },
          verifications: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!caseItem) {
    return null;
  }

  const duplicateCounts = await getDuplicateCountsByHashes(
    caseItem.evidence.map((item) => item.sha256Hash),
  );

  const latestLedgerBlock = await prisma.ledgerBlock.findFirst({
    orderBy: { height: "desc" },
  });
  const totalLedgerBlocks = await prisma.ledgerBlock.count();

  const evidenceIds = new Set(caseItem.evidence.map((item) => item.id));
  const allTransactions = await prisma.ledgerTransaction.findMany({
    orderBy: { createdAt: "asc" },
  });
  const caseTransactions = allTransactions.filter((transaction) =>
    isCaseRelatedTransaction(transaction, caseItem.id, evidenceIds),
  );

  const duplicateGroups = [...duplicateCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([sha256Hash, count]) => ({
      sha256Hash,
      count,
      evidence: caseItem.evidence.filter((item) => item.sha256Hash === sha256Hash),
    }));

  const totalCustodyEvents = caseItem.evidence.reduce(
    (total, item) => total + item.custodyEvents.length,
    0,
  );
  const totalVerifications = caseItem.evidence.reduce(
    (total, item) => total + item.verifications.length,
    0,
  );
  const evidenceItemsWithVerification = caseItem.evidence.filter(
    (item) => item.verifications.length > 0,
  ).length;
  const evidenceItemsWithoutVerification =
    caseItem.evidence.length - evidenceItemsWithVerification;
  const matchedVerifications = caseItem.evidence.reduce(
    (total, item) =>
      total + item.verifications.filter((verification) => verification.matched).length,
    0,
  );
  const failedVerifications = totalVerifications - matchedVerifications;

  return {
    caseItem,
    duplicateCounts,
    duplicateGroups,
    generatedAt: new Date(),
    integritySummary: {
      totalEvidenceItems: caseItem.evidence.length,
      totalDuplicateHashGroups: duplicateGroups.length,
      totalCustodyEvents,
      totalVerifications,
      totalVerificationRecords: totalVerifications,
      evidenceItemsWithVerification,
      evidenceItemsWithoutVerification,
      matchedVerifications,
      failedVerifications,
      latestLedgerBlockHeight: latestLedgerBlock?.height ?? null,
      latestLedgerBlockHash: latestLedgerBlock?.blockHash ?? null,
    },
    ledger: {
      latestLedgerBlock,
      totalLedgerBlocks,
      caseTransactions,
      registrationTxHashes: caseItem.evidence
        .map((item) => item.registeredTxHash)
        .filter((hash): hash is string => Boolean(hash)),
      verificationTxHashes: caseTransactions
        .filter((transaction) => transaction.type === "VERIFY_EVIDENCE")
        .map((transaction) => transaction.txHash),
      custodyTxHashes: caseItem.evidence
        .flatMap((item) => item.custodyEvents.map((event) => event.txHash))
        .filter((hash): hash is string => Boolean(hash)),
    },
  };
}
