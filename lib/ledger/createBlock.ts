import type { LedgerBlock, LedgerTransaction, Prisma } from "@prisma/client";
import {
  calculateBlockHash,
  calculateTransactionHash,
} from "@/lib/crypto/block";
import { calculateMerkleRoot } from "@/lib/crypto/merkle";
import { stableJson } from "@/lib/crypto/hash";
import { prisma } from "@/lib/prisma";

const VALIDATOR = "LOCAL_DEV_VALIDATOR";

type DbClient = Prisma.TransactionClient | typeof prisma;

type CreateLedgerBlockParams = {
  type: string;
  payload: unknown;
  signerPublicKey?: string;
  feeAmount?: number;
};

export async function createLedgerBlock(
  params: CreateLedgerBlockParams,
  db: DbClient = prisma,
): Promise<{ block: LedgerBlock; transaction: LedgerTransaction }> {
  const payloadJson = stableJson(params.payload);
  const txHash = calculateTransactionHash(
    params.type,
    payloadJson,
    params.signerPublicKey,
  );

  const latest = await db.ledgerBlock.findFirst({
    orderBy: { height: "desc" },
  });

  const height = latest ? latest.height + 1 : 1;
  const previousHash = latest ? latest.blockHash : "GENESIS";
  const merkleRoot = calculateMerkleRoot([txHash]);
  const timestamp = new Date().toISOString();
  const blockHash = calculateBlockHash(
    height,
    timestamp,
    previousHash,
    merkleRoot,
    VALIDATOR,
  );

  const block = await db.ledgerBlock.create({
    data: {
      height,
      timestamp: new Date(timestamp),
      previousHash,
      merkleRoot,
      blockHash,
      validator: VALIDATOR,
      transactions: {
        create: {
          txHash,
          type: params.type,
          payloadJson,
          signerPublicKey: params.signerPublicKey ?? null,
          feeAmount: params.feeAmount ?? 0,
        },
      },
    },
    include: {
      transactions: true,
    },
  });

  const transaction = block.transactions[0];
  if (!transaction) {
    throw new Error("Failed to create ledger transaction.");
  }

  return { block, transaction };
}
