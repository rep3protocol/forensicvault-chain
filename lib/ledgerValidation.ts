import {
  calculateBlockHash,
  calculateTransactionHash,
} from "@/lib/crypto/block";
import { calculateMerkleRoot } from "@/lib/crypto/merkle";
import { prisma } from "@/lib/prisma";

export type LedgerValidationResult = {
  valid: boolean;
  errors: string[];
  checkedBlocks: number;
};

export async function validateLedgerChain(): Promise<LedgerValidationResult> {
  const blocks = await prisma.ledgerBlock.findMany({
    orderBy: { height: "asc" },
    include: {
      transactions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const errors: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const label = `Block ${block.height}`;

    if (i === 0) {
      if (block.previousHash !== "GENESIS") {
        errors.push(
          `${label}: first block previousHash must be "GENESIS", got "${block.previousHash}".`,
        );
      }
    } else {
      const prior = blocks[i - 1];

      if (block.previousHash !== prior.blockHash) {
        errors.push(
          `${label}: previousHash does not match prior blockHash (expected ${prior.blockHash}, got ${block.previousHash}).`,
        );
      }
    }

    const recomputedTxHashes = block.transactions.map((tx) => {
      try {
        return calculateTransactionHash(
          tx.type,
          tx.payloadJson,
          tx.signerPublicKey ?? undefined,
        );
      } catch {
        errors.push(
          `${label}: transaction ${tx.txHash} payloadJson could not be parsed for hash recomputation.`,
        );

        return `INVALID_TRANSACTION_PAYLOAD:${tx.id}`;
      }
    });
    const recomputedMerkleRoot = calculateMerkleRoot(recomputedTxHashes);

    for (const [txIndex, tx] of block.transactions.entries()) {
      if (recomputedTxHashes[txIndex] !== tx.txHash) {
        errors.push(
          `${label}: transaction ${tx.txHash} hash mismatch after recomputing payload.`,
        );
      }
    }

    if (recomputedMerkleRoot !== block.merkleRoot) {
      errors.push(
        `${label}: merkleRoot mismatch (stored ${block.merkleRoot}, recomputed ${recomputedMerkleRoot}).`,
      );
    }

    const recomputedBlockHash = calculateBlockHash(
      block.height,
      block.timestamp.toISOString(),
      block.previousHash,
      block.merkleRoot,
      block.validator,
    );

    if (recomputedBlockHash !== block.blockHash) {
      errors.push(
        `${label}: blockHash mismatch (stored ${block.blockHash}, recomputed ${recomputedBlockHash}).`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    checkedBlocks: blocks.length,
  };
}
