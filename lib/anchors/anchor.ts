import { calculateMerkleRoot } from "@/lib/crypto/merkle";
import { prisma } from "@/lib/prisma";

export const ANCHOR_WARNING = "LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.";

export type AnchorExport = Awaited<ReturnType<typeof getAnchorExport>>;

export function formatAnchorDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

export async function getAnchorExport() {
  const generatedAt = new Date();

  const [
    blocks,
    evidenceCount,
    custodyEventCount,
    verificationCount,
    caseCount,
    duplicateGroups,
  ] = await Promise.all([
    prisma.ledgerBlock.findMany({
      orderBy: { height: "asc" },
      select: {
        height: true,
        blockHash: true,
      },
    }),
    prisma.evidenceItem.count(),
    prisma.custodyEvent.count(),
    prisma.verification.count(),
    prisma.case.count(),
    prisma.evidenceItem.groupBy({
      by: ["sha256Hash"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const latestBlock = blocks.at(-1) ?? null;
  const blockHashes = blocks.map((block) => block.blockHash);

  return {
    app: "ForensicVault Chain",
    chainId: "forensicvault-local-dev",
    environment: "LOCAL_TESTNET",
    warning: ANCHOR_WARNING,
    generatedAt: generatedAt.toISOString(),
    latestBlockHeight: latestBlock?.height ?? null,
    latestBlockHash: latestBlock?.blockHash ?? null,
    ledgerRoot: blockHashes.length > 0 ? calculateMerkleRoot(blockHashes) : null,
    totalLedgerBlocks: blocks.length,
    evidenceCount,
    custodyEventCount,
    verificationCount,
    caseCount,
    duplicateHashGroupCount: duplicateGroups.filter((group) => group._count._all > 1).length,
    anchorInstructions: [
      "Publish latestBlockHash and ledgerRoot outside this local app.",
      "Later, compare the published values against a newly generated anchor export.",
      "If the local database was silently rewritten, the values should no longer match.",
    ],
  };
}

export function getAnchorText(anchor: AnchorExport) {
  return [
    "ForensicVault Chain Anchor",
    `Generated At: ${anchor.generatedAt}`,
    `Latest Block Height: ${anchor.latestBlockHeight ?? "N/A"}`,
    `Latest Block Hash: ${anchor.latestBlockHash ?? "N/A"}`,
    `Ledger Root: ${anchor.ledgerRoot ?? "N/A"}`,
    `Total Ledger Blocks: ${anchor.totalLedgerBlocks}`,
    `Environment: ${anchor.environment}`,
    `Warning: ${anchor.warning}`,
  ].join("\n");
}
