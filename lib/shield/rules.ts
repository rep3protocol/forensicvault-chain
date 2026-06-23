import type {
  ShieldAlert,
  ShieldDuplicateGroup,
  ShieldSeverity,
} from "@/lib/shield/types";
import type { AnchorComparisonResult } from "@/lib/anchors/history";

type EvidenceForRule = {
  id: string;
  originalName: string;
  mimeType: string | null;
  registeredBlockHeight: number | null;
  registeredTxHash: string | null;
  case: {
    id: string;
    title: string;
  };
  verifications: {
    id: string;
    matched: boolean;
    createdAt: Date;
  }[];
  custodyEvents: {
    id: string;
    notes: string | null;
    previousEventHash: string | null;
    eventHash: string;
    createdAt: Date;
  }[];
};

function createAlert(input: ShieldAlert): ShieldAlert {
  return input;
}

function evidenceReference(evidence: EvidenceForRule) {
  return `${evidence.originalName} · Case: ${evidence.case.title}`;
}

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

function extensionFor(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? null;
}

function mimeMismatchReason(evidence: EvidenceForRule) {
  const extension = extensionFor(evidence.originalName);
  const mimeType = evidence.mimeType?.toLowerCase() ?? "";

  if (!extension || !mimeType) return null;
  if (extension === "pdf" && !mimeType.includes("pdf")) {
    return `.pdf file has MIME type "${evidence.mimeType}".`;
  }
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "tif", "tiff"].includes(extension)) {
    if (!mimeType.includes("image")) {
      return `Image extension .${extension} has MIME type "${evidence.mimeType}".`;
    }
  }
  if (extension === "txt" && !mimeType.includes("text")) {
    return `.txt file has MIME type "${evidence.mimeType}".`;
  }

  return null;
}

export function ledgerAlerts(valid: boolean, errors: string[]): ShieldAlert[] {
  if (valid) {
    return [
      createAlert({
        id: "ledger-valid",
        severity: "INFO",
        category: "ledger",
        title: "Ledger valid",
        description: "The local ledger validator did not report block hash or merkle root errors.",
        reference: "Ledger",
        reason: "Existing ledger validation returned valid=true.",
        action: "Continue normal SHA-256 verification and external anchor exports.",
      }),
    ];
  }

  return [
    createAlert({
      id: "ledger-invalid",
      severity: "CRITICAL",
      category: "ledger",
      title: "Ledger validation failed",
      description: "The local ledger validator found one or more deterministic integrity errors.",
      reference: "Ledger",
      reason: errors[0] ?? "Ledger validation returned valid=false.",
      action:
        "Run ledger validation and restore from tamper-test backup if this was caused by a controlled test.",
    }),
  ];
}

export function evidenceAlerts(evidenceItems: EvidenceForRule[]): ShieldAlert[] {
  const alerts: ShieldAlert[] = [];

  for (const evidence of evidenceItems) {
    if (evidence.registeredBlockHeight === null || isBlank(evidence.registeredTxHash)) {
      alerts.push(
        createAlert({
          id: `evidence-missing-registration-${evidence.id}`,
          severity: "CRITICAL",
          category: "evidence",
          title: "Evidence registration reference missing",
          description:
            "An evidence item is missing its registered block height or registered transaction hash.",
          reference: evidenceReference(evidence),
          reason: `registeredBlockHeight=${evidence.registeredBlockHeight ?? "null"}, registeredTxHash=${
            evidence.registeredTxHash ?? "null"
          }.`,
          action: "Review the evidence registration and confirm it was anchored to the local ledger.",
        }),
      );
    }

    if (evidence.verifications.length === 0) {
      alerts.push(
        createAlert({
          id: `evidence-unverified-${evidence.id}`,
          severity: "MEDIUM",
          category: "evidence",
          title: "Evidence has never been verified",
          description: "No verification records exist for this evidence item.",
          reference: evidenceReference(evidence),
          reason: "Verification count for this evidence item is 0.",
          action: "Verify this evidence item with the original file.",
        }),
      );
    }

    for (const verification of evidence.verifications) {
      if (!verification.matched) {
        alerts.push(
          createAlert({
            id: `verification-failed-${verification.id}`,
            severity: "HIGH",
            category: "evidence",
            title: "Failed verification exists",
            description: "A verification record does not match the registered SHA-256 hash.",
            reference: evidenceReference(evidence),
            reason: `Verification ${verification.id} recorded matched=false.`,
            action: "Verify this evidence item with the original file.",
          }),
        );
      }
    }

    const mismatchReason = mimeMismatchReason(evidence);
    if (mismatchReason) {
      alerts.push(
        createAlert({
          id: `mime-mismatch-${evidence.id}`,
          severity: "MEDIUM",
          category: "evidence",
          title: "Possible MIME/extension mismatch",
          description: "The filename extension does not match the recorded MIME type.",
          reference: evidenceReference(evidence),
          reason: mismatchReason,
          action: "Review this evidence item's metadata and original file type.",
        }),
      );
    }
  }

  if (!alerts.some((alert) => alert.id.startsWith("verification-failed-"))) {
    alerts.push(
      createAlert({
        id: "no-failed-verifications",
        severity: "INFO",
        category: "evidence",
        title: "No failed verifications",
        description: "No verification records currently report matched=false.",
        reference: "Verification records",
        reason: "Failed verification count is 0.",
        action: "Continue normal SHA-256 verification and external anchor exports.",
      }),
    );
  }

  return alerts;
}

export function custodyAlerts(evidenceItems: EvidenceForRule[]): ShieldAlert[] {
  const alerts: ShieldAlert[] = [];

  for (const evidence of evidenceItems) {
    const events = evidence.custodyEvents;

    for (const event of events) {
      if (isBlank(event.notes)) {
        alerts.push(
          createAlert({
            id: `custody-missing-notes-${event.id}`,
            severity: "MEDIUM",
            category: "custody",
            title: "Custody event missing notes",
            description: "A custody event has no notes for audit readability.",
            reference: evidenceReference(evidence),
            reason: `Custody event ${event.id} has empty notes.`,
            action: "Add custody notes for better audit readability.",
          }),
        );
      }

      if (isBlank(event.eventHash) || isBlank(event.previousEventHash)) {
        alerts.push(
          createAlert({
            id: `custody-missing-hash-${event.id}`,
            severity: "CRITICAL",
            category: "custody",
            title: "Custody event hash reference missing",
            description: "A custody event is missing its event hash or previous event hash.",
            reference: evidenceReference(evidence),
            reason: `eventHash=${event.eventHash || "empty"}, previousEventHash=${
              event.previousEventHash || "empty"
            }.`,
            action: "Review custody hash linkage before using this evidence in a report.",
          }),
        );
      }
    }

    if (events.length > 0) {
      const first = events[0];

      if (first.previousEventHash !== evidence.registeredTxHash) {
        alerts.push(
          createAlert({
            id: `custody-link-broken-first-${first.id}`,
            severity: "CRITICAL",
            category: "custody",
            title: "Custody hash linkage appears broken",
            description:
              "The first custody event does not point back to the registered transaction hash.",
            reference: evidenceReference(evidence),
            reason: `Expected previousEventHash=${evidence.registeredTxHash ?? "null"}, got ${
              first.previousEventHash ?? "null"
            }.`,
            action: "Review custody hash linkage before using this evidence in a report.",
          }),
        );
      }

      for (let index = 1; index < events.length; index++) {
        const previous = events[index - 1];
        const current = events[index];

        if (current.previousEventHash !== previous.eventHash) {
          alerts.push(
            createAlert({
              id: `custody-link-broken-${current.id}`,
              severity: "CRITICAL",
              category: "custody",
              title: "Custody hash linkage appears broken",
              description: "A custody event does not point to the prior custody event hash.",
              reference: evidenceReference(evidence),
              reason: `Expected previousEventHash=${previous.eventHash}, got ${
                current.previousEventHash ?? "null"
              }.`,
              action: "Review custody hash linkage before using this evidence in a report.",
            }),
          );
        }
      }
    }
  }

  return alerts;
}

export function duplicateAlerts(groups: ShieldDuplicateGroup[]): ShieldAlert[] {
  const alerts: ShieldAlert[] = [];

  for (const group of groups) {
    const crossCase = group.caseCount > 1;
    const severity: ShieldSeverity = crossCase ? "HIGH" : "LOW";

    alerts.push(
      createAlert({
        id: `duplicate-${group.sha256Hash}`,
        severity,
        category: "duplicates",
        title: crossCase
          ? "Duplicate SHA-256 appears across multiple cases"
          : "Duplicate SHA-256 appears inside one case",
        description: `${group.itemCount} evidence items share the same SHA-256 hash.`,
        reference: group.caseTitles.join(", "),
        reason: `Hash ${group.sha256Hash} appears in ${group.itemCount} items across ${group.caseCount} case(s).`,
        action: crossCase
          ? "Review cross-case duplicate evidence before using it in a report."
          : "Confirm the duplicate evidence was intentionally registered in this case.",
      }),
    );
  }

  if (!groups.some((group) => group.caseCount > 1)) {
    alerts.push(
      createAlert({
        id: "no-cross-case-duplicates",
        severity: "INFO",
        category: "duplicates",
        title: "No cross-case duplicate hash groups",
        description: "No duplicate SHA-256 group currently spans multiple cases.",
        reference: "Duplicate scan",
        reason: "Cross-case duplicate hash group count is 0.",
        action: "Continue reviewing duplicate hash groups before report export.",
      }),
    );
  }

  return alerts;
}

export function tamperBackupAlerts(fileCount: number): ShieldAlert[] {
  if (fileCount === 0) return [];

  return [
    createAlert({
      id: "tamper-backup-files-exist",
      severity: "HIGH",
      category: "storage",
      title: "Tamper-test backup files exist",
      description:
        "The local tamper-test backup folder contains files from destructive development testing.",
      reference: "storage/tamper-test-backups",
      reason: `${fileCount} file(s) found in storage/tamper-test-backups.`,
      action:
        "Run ledger validation and restore from tamper-test backup if this was caused by a controlled test.",
    }),
  ];
}

export function anchorAlerts(input: {
  savedAnchorCount: number;
  latestSavedAnchorHeight: number | null;
  latestComparison: AnchorComparisonResult;
}): ShieldAlert[] {
  const { savedAnchorCount, latestSavedAnchorHeight, latestComparison } = input;

  if (savedAnchorCount === 0) {
    return [
      createAlert({
        id: "anchor-history-empty",
        severity: "INFO",
        category: "anchors",
        title: "No saved anchor history",
        description: "No local anchor snapshots have been saved yet.",
        reference: "Anchor History",
        reason: "AnchorRecord count is 0.",
        action: "Save an anchor snapshot after important ledger changes.",
      }),
    ];
  }

  if (latestComparison.matches) {
    return [
      createAlert({
        id: "anchor-latest-matches-current",
        severity: "INFO",
        category: "anchors",
        title: "Latest saved anchor matches current ledger",
        description:
          "The latest saved anchor has the same latestBlockHash and ledgerRoot as the current ledger.",
        reference: `Saved height ${latestSavedAnchorHeight ?? "N/A"}`,
        reason: latestComparison.reason,
        action: "Continue exporting anchors after important ledger changes.",
      }),
    ];
  }

  if (
    latestComparison.currentLatestBlockHeight !== null &&
    latestComparison.savedLatestBlockHeight !== null &&
    latestComparison.currentLatestBlockHeight > latestComparison.savedLatestBlockHeight
  ) {
    return [
      createAlert({
        id: "anchor-current-ledger-ahead",
        severity: "MEDIUM",
        category: "anchors",
        title: "Current ledger has changed since latest saved anchor",
        description:
          "The current ledger height is greater than the latest saved anchor height and anchor values differ.",
        reference: `Current height ${latestComparison.currentLatestBlockHeight}; saved height ${latestComparison.savedLatestBlockHeight}`,
        reason: latestComparison.reason,
        action:
          "Save a new anchor snapshot and publish it externally if this ledger growth is expected.",
      }),
    ];
  }

  if (
    latestComparison.currentLatestBlockHeight !== null &&
    latestComparison.savedLatestBlockHeight !== null &&
    latestComparison.currentLatestBlockHeight < latestComparison.savedLatestBlockHeight
  ) {
    return [
      createAlert({
        id: "anchor-current-ledger-behind",
        severity: "HIGH",
        category: "anchors",
        title: "Current ledger is behind saved anchor",
        description:
          "The current ledger height is lower than a previously saved anchor snapshot.",
        reference: `Current height ${latestComparison.currentLatestBlockHeight}; saved height ${latestComparison.savedLatestBlockHeight}`,
        reason: latestComparison.reason,
        action: "Review whether the database was restored, replaced, or rewritten.",
      }),
    ];
  }

  return [
    createAlert({
      id: "anchor-same-height-mismatch",
      severity: "HIGH",
      category: "anchors",
      title: "Saved anchor mismatch at same block height",
      description:
        "The latest saved anchor height matches the current ledger height, but latestBlockHash or ledgerRoot differs.",
      reference: `Saved height ${latestSavedAnchorHeight ?? "N/A"}`,
      reason: latestComparison.reason,
      action:
        "Review for local database rewrite, restore, corruption, or tamper-test activity.",
    }),
  ];
}
