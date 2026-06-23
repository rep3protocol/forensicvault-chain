"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sha256Buffer } from "@/lib/crypto/hash";
import { createLedgerBlock } from "@/lib/ledger/createBlock";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PUBLIC_KEY,
  DEFAULT_WALLET_ADDRESS,
  ensureSufficientBalance,
  FEES,
  getFee,
} from "@/lib/token/testVault";

const EVIDENCE_TYPES = [
  "image",
  "video",
  "pdf",
  "audio",
  "document",
  "screenshot",
  "other",
] as const;

const VALIDATOR_ADDRESS = "LOCAL_DEV_VALIDATOR";
const STORAGE_DIR = path.join(process.cwd(), "storage", "evidence");

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.length > 0 ? base.slice(0, 200) : "evidence-file";
}

export async function registerEvidence(caseId: string, formData: FormData) {
  const file = formData.get("file");
  const evidenceType = formData.get("evidenceType")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim();

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A file is required.");
  }

  if (!evidenceType || !EVIDENCE_TYPES.includes(evidenceType as (typeof EVIDENCE_TYPES)[number])) {
    throw new Error("A valid evidence type is required.");
  }

  const caseItem = await prisma.case.findUnique({
    where: { id: caseId },
  });

  if (!caseItem) {
    throw new Error("Case not found.");
  }

  const wallet = await prisma.wallet.findUnique({
    where: { address: DEFAULT_WALLET_ADDRESS },
  });

  if (!wallet) {
    throw new Error(
      'Default wallet not found. Run GET /api/dev/seed before registering evidence.',
    );
  }

  const fee = getFee("REGISTER_EVIDENCE");
  ensureSufficientBalance(wallet.balance, fee);

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256Hash = sha256Buffer(buffer);
  const originalName = file.name;
  const safeName = sanitizeFilename(originalName);
  const storedFilename = `${Date.now()}-${safeName}`;
  const absolutePath = path.join(STORAGE_DIR, storedFilename);
  const storedPath = path.join("storage", "evidence", storedFilename);

  const existingDuplicates = await prisma.evidenceItem.findMany({
    where: { caseId, sha256Hash },
    select: { id: true },
  });

  await mkdir(STORAGE_DIR, { recursive: true });
  await writeFile(absolutePath, buffer);

  const storedAt = new Date().toISOString();
  const mimeType = file.type || null;
  const sizeBytes = buffer.length;

  await prisma.$transaction(async (tx) => {
    const evidence = await tx.evidenceItem.create({
      data: {
        caseId,
        originalName,
        storedPath,
        mimeType,
        sizeBytes,
        sha256Hash,
        evidenceType,
        status: "REGISTERED",
      },
    });

    const { block, transaction } = await createLedgerBlock(
      {
        type: "REGISTER_EVIDENCE",
        payload: {
          evidenceId: evidence.id,
          caseId,
          originalName,
          mimeType,
          sizeBytes,
          sha256Hash,
          evidenceType,
          storedAt,
          notes: notes || null,
          ...(existingDuplicates.length > 0
            ? {
                duplicateDetected: true,
                duplicateEvidenceIds: existingDuplicates.map((item) => item.id),
                duplicateCount: existingDuplicates.length,
              }
            : {}),
        },
        signerPublicKey: DEFAULT_PUBLIC_KEY,
        feeAmount: FEES.REGISTER_EVIDENCE,
      },
      tx,
    );

    await tx.evidenceItem.update({
      where: { id: evidence.id },
      data: {
        registeredBlockHeight: block.height,
        registeredTxHash: transaction.txHash,
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: wallet.balance - fee,
      },
    });

    await tx.tokenTransaction.create({
      data: {
        fromWallet: wallet.address,
        toWallet: VALIDATOR_ADDRESS,
        amount: fee,
        type: "SPEND_TEST_VAULT",
        reason: "REGISTER_EVIDENCE",
      },
    });
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/");
  revalidatePath("/ledger");
  revalidatePath("/wallet");
  redirect(`/cases/${caseId}`);
}
