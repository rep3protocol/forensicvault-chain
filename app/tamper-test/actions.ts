"use server";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { stableJson } from "@/lib/crypto/hash";
import { prisma } from "@/lib/prisma";

const TAMPER_MARKER = "TAMPERED_BY_FORENSICVAULT_TEST";
const BACKUP_DIR = path.join(process.cwd(), "storage", "tamper-test-backups");

type BlockBackup = {
  timestamp: string;
  blockId: string;
  blockHeight: number;
  originalBlock: {
    id: string;
    height: number;
    timestamp: string;
    previousHash: string;
    merkleRoot: string;
    blockHash: string;
    validator: string;
    validatorSig: string | null;
  };
  originalTransactions: {
    id: string;
    txHash: string;
    type: string;
    payloadJson: string;
    signerPublicKey: string | null;
    signature: string | null;
    feeAmount: number;
    createdAt: string;
  }[];
};

function backupName(height: number, blockId: string, timestamp: string) {
  const safeTimestamp = timestamp.replace(/[:.]/g, "-");

  return `${safeTimestamp}-height-${height}-${blockId}.json`;
}

async function ensureBackupDir() {
  await mkdir(BACKUP_DIR, { recursive: true });
}

function tamperPayloadJson(payloadJson: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(payloadJson) as unknown;
  } catch {
    return stableJson({
      originalPayloadJson: payloadJson,
      tamperMarker: TAMPER_MARKER,
    });
  }

  if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
    return stableJson({
      ...(parsed as Record<string, unknown>),
      tamperMarker: TAMPER_MARKER,
    });
  }

  return stableJson({
    originalPayload: parsed,
    tamperMarker: TAMPER_MARKER,
  });
}

export async function tamperWithBlock(formData: FormData) {
  const blockId = String(formData.get("blockId") ?? "");

  if (!blockId) {
    redirect("/tamper-test");
  }

  const block = await prisma.ledgerBlock.findUnique({
    where: { id: blockId },
    include: {
      transactions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!block) {
    redirect("/tamper-test");
  }

  const timestamp = new Date().toISOString();
  const backup: BlockBackup = {
    timestamp,
    blockId: block.id,
    blockHeight: block.height,
    originalBlock: {
      id: block.id,
      height: block.height,
      timestamp: block.timestamp.toISOString(),
      previousHash: block.previousHash,
      merkleRoot: block.merkleRoot,
      blockHash: block.blockHash,
      validator: block.validator,
      validatorSig: block.validatorSig,
    },
    originalTransactions: block.transactions.map((tx) => ({
      id: tx.id,
      txHash: tx.txHash,
      type: tx.type,
      payloadJson: tx.payloadJson,
      signerPublicKey: tx.signerPublicKey,
      signature: tx.signature,
      feeAmount: tx.feeAmount,
      createdAt: tx.createdAt.toISOString(),
    })),
  };

  await ensureBackupDir();
  await writeFile(
    path.join(BACKUP_DIR, backupName(block.height, block.id, timestamp)),
    JSON.stringify(backup, null, 2),
    "utf8",
  );

  const firstTransaction = block.transactions[0];

  if (firstTransaction) {
    await prisma.ledgerTransaction.update({
      where: { id: firstTransaction.id },
      data: {
        payloadJson: tamperPayloadJson(firstTransaction.payloadJson),
      },
    });
  } else {
    await prisma.ledgerBlock.update({
      where: { id: block.id },
      data: {
        validator: `${block.validator}:${TAMPER_MARKER}`,
      },
    });
  }

  redirect("/tamper-test");
}

export async function restoreLatestTamperBackup() {
  await ensureBackupDir();

  const files = (await readdir(BACKUP_DIR))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();

  const latest = files[0];

  if (!latest) {
    redirect("/tamper-test");
  }

  const backup = JSON.parse(
    await readFile(path.join(BACKUP_DIR, latest), "utf8"),
  ) as BlockBackup;

  await prisma.$transaction(async (tx) => {
    await tx.ledgerBlock.update({
      where: { id: backup.blockId },
      data: {
        height: backup.originalBlock.height,
        timestamp: new Date(backup.originalBlock.timestamp),
        previousHash: backup.originalBlock.previousHash,
        merkleRoot: backup.originalBlock.merkleRoot,
        blockHash: backup.originalBlock.blockHash,
        validator: backup.originalBlock.validator,
        validatorSig: backup.originalBlock.validatorSig,
      },
    });

    for (const transaction of backup.originalTransactions) {
      await tx.ledgerTransaction.update({
        where: { id: transaction.id },
        data: {
          txHash: transaction.txHash,
          type: transaction.type,
          payloadJson: transaction.payloadJson,
          signerPublicKey: transaction.signerPublicKey,
          signature: transaction.signature,
          feeAmount: transaction.feeAmount,
          createdAt: new Date(transaction.createdAt),
        },
      });
    }
  });

  redirect("/tamper-test");
}
