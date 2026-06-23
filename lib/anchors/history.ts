import type { AnchorRecord } from "@prisma/client";
import { getAnchorExport } from "@/lib/anchors/anchor";
import { prisma } from "@/lib/prisma";

export type AnchorComparisonStatus =
  | "MATCH"
  | "MISMATCH"
  | "CURRENT_AHEAD"
  | "CURRENT_BEHIND"
  | "NO_CURRENT_ANCHOR"
  | "NO_SAVED_ANCHOR";

export type AnchorComparisonResult = {
  recordId: string | null;
  comparedAt: Date;
  status: AnchorComparisonStatus;
  matches: boolean;
  latestBlockHashMatches: boolean;
  ledgerRootMatches: boolean;
  currentLatestBlockHeight: number | null;
  savedLatestBlockHeight: number | null;
  currentLatestBlockHash: string | null;
  savedLatestBlockHash: string | null;
  currentLedgerRoot: string | null;
  savedLedgerRoot: string | null;
  reason: string;
};

type CreateAnchorRecordInput = {
  label?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
};

export type DuplicateAnchorRecordGroup = {
  latestBlockHeight: number;
  latestBlockHash: string;
  ledgerRoot: string;
  count: number;
  recordIds: string[];
  labels: string[];
};

function cleanOptional(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function requireAnchorString(value: string | null, label: string) {
  if (value === null) {
    throw new Error(`Cannot save anchor record without ${label}.`);
  }

  return value;
}

function requireAnchorNumber(value: number | null, label: string) {
  if (value === null) {
    throw new Error(`Cannot save anchor record without ${label}.`);
  }

  return value;
}

export async function createAnchorRecord(input: CreateAnchorRecordInput = {}) {
  const anchor = await getAnchorExport();
  const latestBlockHeight = requireAnchorNumber(
    anchor.latestBlockHeight,
    "latest block height",
  );
  const latestBlockHash = requireAnchorString(anchor.latestBlockHash, "latest block hash");
  const ledgerRoot = requireAnchorString(anchor.ledgerRoot, "ledger root");

  return prisma.anchorRecord.create({
    data: {
      label: cleanOptional(input.label),
      chainId: anchor.chainId,
      environment: anchor.environment,
      latestBlockHeight,
      latestBlockHash,
      ledgerRoot,
      totalLedgerBlocks: anchor.totalLedgerBlocks,
      evidenceCount: anchor.evidenceCount,
      custodyEventCount: anchor.custodyEventCount,
      verificationCount: anchor.verificationCount,
      caseCount: anchor.caseCount,
      duplicateHashGroupCount: anchor.duplicateHashGroupCount,
      exportedJson: JSON.stringify(anchor, null, 2),
      createdById: input.createdById ?? null,
      createdByName: input.createdByName ?? null,
    },
  });
}

export async function getAnchorRecords() {
  return prisma.anchorRecord.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getLatestAnchorRecord() {
  return prisma.anchorRecord.findFirst({
    orderBy: { createdAt: "desc" },
  });
}

export async function findDuplicateAnchorRecordForCurrent() {
  const anchor = await getAnchorExport();

  if (
    anchor.latestBlockHeight === null ||
    !anchor.latestBlockHash ||
    !anchor.ledgerRoot
  ) {
    return null;
  }

  return prisma.anchorRecord.findFirst({
    where: {
      latestBlockHeight: anchor.latestBlockHeight,
      latestBlockHash: anchor.latestBlockHash,
      ledgerRoot: anchor.ledgerRoot,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDuplicateAnchorRecordGroups(): Promise<
  DuplicateAnchorRecordGroup[]
> {
  const records = await prisma.anchorRecord.findMany({
    orderBy: { createdAt: "desc" },
  });
  const groups = new Map<string, AnchorRecord[]>();

  for (const record of records) {
    const key = [
      record.latestBlockHeight,
      record.latestBlockHash,
      record.ledgerRoot,
    ].join(":");
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  return [...groups.values()]
    .filter((recordsForGroup) => recordsForGroup.length > 1)
    .map((recordsForGroup) => {
      const first = recordsForGroup[0];

      return {
        latestBlockHeight: first.latestBlockHeight,
        latestBlockHash: first.latestBlockHash,
        ledgerRoot: first.ledgerRoot,
        count: recordsForGroup.length,
        recordIds: recordsForGroup.map((record) => record.id),
        labels: recordsForGroup
          .map((record) => record.label)
          .filter((label): label is string => Boolean(label)),
      };
    });
}

function compareAnchorValues(
  record: AnchorRecord | null,
  current: Awaited<ReturnType<typeof getAnchorExport>>,
): AnchorComparisonResult {
  const currentLatestBlockHeight = current.latestBlockHeight;
  const currentLatestBlockHash = current.latestBlockHash;
  const currentLedgerRoot = current.ledgerRoot;

  if (!record) {
    return {
      recordId: null,
      comparedAt: new Date(),
      status: "NO_SAVED_ANCHOR",
      matches: false,
      latestBlockHashMatches: false,
      ledgerRootMatches: false,
      currentLatestBlockHeight,
      savedLatestBlockHeight: null,
      currentLatestBlockHash,
      savedLatestBlockHash: null,
      currentLedgerRoot,
      savedLedgerRoot: null,
      reason: "No saved anchor record exists.",
    };
  }

  if (currentLatestBlockHeight === null || !currentLatestBlockHash || !currentLedgerRoot) {
    return {
      recordId: record.id,
      comparedAt: new Date(),
      status: "NO_CURRENT_ANCHOR",
      matches: false,
      latestBlockHashMatches: false,
      ledgerRootMatches: false,
      currentLatestBlockHeight,
      savedLatestBlockHeight: record.latestBlockHeight,
      currentLatestBlockHash,
      savedLatestBlockHash: record.latestBlockHash,
      currentLedgerRoot,
      savedLedgerRoot: record.ledgerRoot,
      reason: "Current ledger does not have anchorable block values.",
    };
  }

  const latestBlockHashMatches = currentLatestBlockHash === record.latestBlockHash;
  const ledgerRootMatches = currentLedgerRoot === record.ledgerRoot;
  const matches = latestBlockHashMatches && ledgerRootMatches;
  let status: AnchorComparisonStatus = "MISMATCH";
  let reason = "Saved latestBlockHash or ledgerRoot differs from current values.";

  if (matches) {
    status = "MATCH";
    reason = "Current latestBlockHash and ledgerRoot match the saved anchor record.";
  } else if (currentLatestBlockHeight > record.latestBlockHeight) {
    status = "CURRENT_AHEAD";
    reason =
      "Current block height is greater than the saved anchor height and anchor values differ.";
  } else if (currentLatestBlockHeight < record.latestBlockHeight) {
    status = "CURRENT_BEHIND";
    reason =
      "Current block height is lower than the saved anchor height and anchor values differ.";
  } else {
    reason =
      "Current block height equals the saved anchor height, but latestBlockHash or ledgerRoot differs.";
  }

  return {
    recordId: record.id,
    comparedAt: new Date(),
    status,
    matches,
    latestBlockHashMatches,
    ledgerRootMatches,
    currentLatestBlockHeight,
    savedLatestBlockHeight: record.latestBlockHeight,
    currentLatestBlockHash,
    savedLatestBlockHash: record.latestBlockHash,
    currentLedgerRoot,
    savedLedgerRoot: record.ledgerRoot,
    reason,
  };
}

export async function compareCurrentAnchorToRecord(recordId: string) {
  const [record, current] = await Promise.all([
    prisma.anchorRecord.findUnique({ where: { id: recordId } }),
    getAnchorExport(),
  ]);

  return compareAnchorValues(record, current);
}

export async function compareCurrentAnchorToLatestRecord() {
  const [record, current] = await Promise.all([
    getLatestAnchorRecord(),
    getAnchorExport(),
  ]);

  return compareAnchorValues(record, current);
}

export async function getAnchorHistorySummary() {
  const [
    savedAnchorCount,
    latestRecord,
    latestComparison,
    duplicateAnchorRecordGroups,
  ] = await Promise.all([
    prisma.anchorRecord.count(),
    getLatestAnchorRecord(),
    compareCurrentAnchorToLatestRecord(),
    getDuplicateAnchorRecordGroups(),
  ]);

  return {
    savedAnchorCount,
    latestRecord,
    latestSavedAnchorHeight: latestRecord?.latestBlockHeight ?? null,
    latestAnchorMatchesCurrent: latestComparison.matches,
    latestAnchorComparisonStatus: latestComparison.status,
    latestComparison,
    duplicateAnchorRecordGroups,
    duplicateAnchorRecordGroupCount: duplicateAnchorRecordGroups.length,
  };
}
