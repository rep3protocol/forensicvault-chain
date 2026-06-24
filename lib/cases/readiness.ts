import { compareCurrentAnchorToLatestRecord, getLatestAnchorRecord } from "@/lib/anchors/history";
import { getCustodySignatureSummaryForCase } from "@/lib/custody/signatures";
import { getDuplicateCountsByHashes } from "@/lib/evidence/duplicates";
import { prisma } from "@/lib/prisma";

export type CaseReadinessStatus = "PASS" | "WARNING" | "FAIL" | "INFO";

export type CaseReadinessCheck = {
  id: string;
  label: string;
  status: CaseReadinessStatus;
  detail: string;
  action: string;
};

export type CaseReadinessResult = {
  caseId: string;
  checks: CaseReadinessCheck[];
  warningCount: number;
  failCount: number;
  signatureStatus: CaseReadinessStatus;
};

function custodyChainValid(
  registeredTxHash: string | null,
  events: { previousEventHash: string | null; eventHash: string }[],
) {
  if (events.length === 0) return true;
  if (!registeredTxHash) return false;
  if (events[0].previousEventHash !== registeredTxHash) return false;

  for (let index = 1; index < events.length; index++) {
    if (events[index].previousEventHash !== events[index - 1].eventHash) {
      return false;
    }
  }

  return true;
}

function check(
  id: string,
  label: string,
  status: CaseReadinessStatus,
  detail: string,
  action: string,
): CaseReadinessCheck {
  return { id, label, status, detail, action };
}

export async function getCaseReadiness(caseId: string): Promise<CaseReadinessResult | null> {
  const caseItem = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      evidence: {
        include: {
          verifications: true,
          custodyEvents: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!caseItem) return null;

  const evidence = caseItem.evidence;
  const evidenceCount = evidence.length;
  const verificationMissingCount = evidence.filter(
    (item) => item.verifications.length === 0,
  ).length;
  const failedVerificationCount = evidence.reduce(
    (count, item) =>
      count + item.verifications.filter((verification) => !verification.matched).length,
    0,
  );
  const missingRegistrationCount = evidence.filter(
    (item) => item.registeredBlockHeight === null || !item.registeredTxHash?.trim(),
  ).length;
  const custodyEventCount = evidence.reduce(
    (count, item) => count + item.custodyEvents.length,
    0,
  );
  const brokenCustodyCount = evidence.filter(
    (item) => !custodyChainValid(item.registeredTxHash, item.custodyEvents),
  ).length;
  const duplicateCounts = await getDuplicateCountsByHashes(
    evidence.map((item) => item.sha256Hash),
  );
  const duplicateGroupCount = [...new Set(evidence.map((item) => item.sha256Hash))].filter(
    (hash) => (duplicateCounts.get(hash) ?? 0) > 1,
  ).length;
  const signatureSummary = await getCustodySignatureSummaryForCase(caseId);
  const [latestAnchor, latestComparison] = await Promise.all([
    getLatestAnchorRecord(),
    compareCurrentAnchorToLatestRecord(),
  ]);

  const checks: CaseReadinessCheck[] = [
    check(
      "has-evidence",
      "Has at least one evidence item",
      evidenceCount > 0 ? "PASS" : "FAIL",
      `${evidenceCount} evidence item(s) registered.`,
      "Add evidence before exporting a case packet.",
    ),
    check(
      "verified-evidence",
      "Every evidence item has been verified at least once",
      verificationMissingCount === 0 ? "PASS" : "WARNING",
      `${verificationMissingCount} evidence item(s) have no verification record.`,
      "Verify each evidence item with the original file.",
    ),
    check(
      "failed-verifications",
      "No failed verifications",
      failedVerificationCount === 0 ? "PASS" : "FAIL",
      `${failedVerificationCount} failed verification record(s) found.`,
      "Review failed verification records before using this case in a report.",
    ),
    check(
      "registration-references",
      "Evidence has ledger registration references",
      missingRegistrationCount === 0 ? "PASS" : "FAIL",
      `${missingRegistrationCount} evidence item(s) are missing block height or transaction hash.`,
      "Review evidence registration before relying on ledger references.",
    ),
    check(
      "custody-events",
      "Custody events exist",
      custodyEventCount > 0 ? "PASS" : "WARNING",
      custodyEventCount > 0
        ? `${custodyEventCount} custody event(s) recorded.`
        : "No custody events yet.",
      "Add custody events when collection, transfer, review, or export activity occurs.",
    ),
    check(
      "custody-linkage",
      "Custody hash linkage is valid",
      brokenCustodyCount === 0 ? "PASS" : "FAIL",
      `${brokenCustodyCount} evidence item(s) have custody hash linkage problems.`,
      "Review custody event hashes before exporting final case materials.",
    ),
    check(
      "duplicate-hashes",
      "Duplicate hashes reviewed or listed",
      duplicateGroupCount === 0 ? "PASS" : "WARNING",
      `${duplicateGroupCount} duplicate SHA-256 group(s) touch this case.`,
      "Review duplicate evidence before using it in a report.",
    ),
    check(
      "latest-anchor-exists",
      "Latest anchor snapshot exists",
      latestAnchor ? "PASS" : "WARNING",
      latestAnchor
        ? `Latest saved anchor height is ${latestAnchor.latestBlockHeight}.`
        : "No saved anchor snapshot exists.",
      "Save an anchor snapshot after important ledger changes.",
    ),
    check(
      "latest-anchor-comparison",
      "Current anchor is reviewed against latest snapshot",
      latestComparison.matches
        ? "PASS"
        : latestComparison.status === "CURRENT_AHEAD"
          ? "WARNING"
          : "FAIL",
      latestComparison.reason,
      latestComparison.matches
        ? "Continue exporting anchors after important ledger changes."
        : "Review anchor comparison and save a new snapshot if ledger growth is expected.",
    ),
    check(
      "case-packet-export",
      "Case packet can be exported",
      evidenceCount > 0 ? "PASS" : "WARNING",
      evidenceCount > 0
        ? "Case packet export route is available."
        : "Packet export is available, but the case has no evidence.",
      "Use case packet export after reviewing readiness warnings.",
    ),
    check(
      "signature-readiness",
      signatureSummary.status === "PASS"
        ? "Custody signatures verify"
        : signatureSummary.status === "INFO"
          ? "No custody events to sign yet"
          : signatureSummary.status === "WARNING"
            ? "Legacy custody events missing signatures"
            : "One or more custody signatures failed verification",
      signatureSummary.status,
      signatureSummary.message,
      signatureSummary.recommendedAction,
    ),
  ];

  return {
    caseId,
    checks,
    warningCount: checks.filter((item) => item.status === "WARNING").length,
    failCount: checks.filter((item) => item.status === "FAIL").length,
    signatureStatus: signatureSummary.status,
  };
}

export async function getCaseReadinessSummaries() {
  const cases = await prisma.case.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });
  const readiness = await Promise.all(
    cases.map(async (caseItem) => ({
      caseId: caseItem.id,
      title: caseItem.title,
      readiness: await getCaseReadiness(caseItem.id),
    })),
  );

  return readiness
    .filter((item) => item.readiness)
    .map((item) => ({
      caseId: item.caseId,
      title: item.title,
      warningCount: item.readiness?.warningCount ?? 0,
      failCount: item.readiness?.failCount ?? 0,
      signatureStatus: item.readiness?.signatureStatus ?? "INFO",
    }));
}
