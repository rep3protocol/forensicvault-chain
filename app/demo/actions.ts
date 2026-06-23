"use server";

import { rm, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Wallet } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/session";
import { ensureWalletForUser, getSignerPublicKey } from "@/lib/auth/wallet";
import { sha256Buffer, sha256String, stableJson } from "@/lib/crypto/hash";
import { createLedgerBlock } from "@/lib/ledger/createBlock";
import { prisma } from "@/lib/prisma";
import { FEES } from "@/lib/token/testVault";
import {
  DEMO_CASE_TITLE_PREFIX,
  DEMO_STORAGE_DIR,
  DEMO_STORAGE_PATH_PREFIX,
  demoCaseData,
  demoEvidenceFiles,
} from "@/lib/demo/sampleData";

const VALIDATOR_ADDRESS = "LOCAL_DEV_VALIDATOR";

async function spendDemoFee(
  wallet: Wallet,
  amount: number,
  reason: string,
) {
  if (wallet.balance < amount) {
    return wallet;
  }

  const updatedWallet = await prisma.wallet.update({
    where: { id: wallet.id },
    data: { balance: wallet.balance - amount },
  });

  await prisma.tokenTransaction.create({
    data: {
      fromWallet: wallet.address,
      toWallet: VALIDATOR_ADDRESS,
      amount,
      type: "SPEND_TEST_VAULT",
      reason,
    },
  });

  return updatedWallet;
}

function revalidateDemoPaths(caseId?: string, evidenceId?: string) {
  revalidatePath("/");
  revalidatePath("/demo");
  revalidatePath("/cases");
  revalidatePath("/reports");
  revalidatePath("/verify");
  revalidatePath("/ledger");
  revalidatePath("/anchors");
  revalidatePath("/wallet");

  if (caseId) {
    revalidatePath(`/cases/${caseId}`);
    revalidatePath(`/cases/${caseId}/packet`);
  }

  if (evidenceId) {
    revalidatePath(`/evidence/${evidenceId}`);
    revalidatePath(`/reports/${evidenceId}`);
    revalidatePath(`/verify/${evidenceId}`);
  }
}

export async function createDemoCase() {
  const user = await requireCurrentUser();
  let wallet = await ensureWalletForUser(user);

  const existingDemoCase = await prisma.case.findFirst({
    where: { title: { startsWith: DEMO_CASE_TITLE_PREFIX } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (existingDemoCase) {
    redirect("/demo");
  }

  await mkdir(DEMO_STORAGE_DIR, { recursive: true });

  const caseItem = await prisma.case.create({
    data: {
      ...demoCaseData,
      ownerId: user.id,
    },
  });

  const createdEvidence: {
    id: string;
    originalName: string;
    sha256Hash: string;
    registeredTxHash: string | null;
  }[] = [];

  for (const file of demoEvidenceFiles) {
    const buffer = Buffer.from(file.content, "utf8");
    const sha256Hash = sha256Buffer(buffer);
    const storedFilename = file.originalName;
    const absolutePath = path.join(DEMO_STORAGE_DIR, storedFilename);
    const storedPath = path.join(DEMO_STORAGE_PATH_PREFIX, storedFilename);
    const storedAt = new Date().toISOString();

    await writeFile(absolutePath, buffer);

    const evidence = await prisma.evidenceItem.create({
      data: {
        caseId: caseItem.id,
        originalName: file.originalName,
        storedPath,
        mimeType: file.mimeType,
        sizeBytes: buffer.length,
        sha256Hash,
        evidenceType: file.evidenceType,
        status: "REGISTERED",
      },
    });

    const duplicateCount = await prisma.evidenceItem.count({
      where: { sha256Hash },
    });

    const { block, transaction } = await createLedgerBlock({
      type: "REGISTER_EVIDENCE",
      payload: {
        evidenceId: evidence.id,
        caseId: caseItem.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: buffer.length,
        sha256Hash,
        evidenceType: file.evidenceType,
        storedAt,
        notes: "Demo evidence registration.",
        demo: true,
        ...(duplicateCount > 1
          ? {
              duplicateDetected: true,
              duplicateCount,
            }
          : {}),
      },
      signerPublicKey: getSignerPublicKey(user),
      feeAmount: FEES.REGISTER_EVIDENCE,
    });

    const updatedEvidence = await prisma.evidenceItem.update({
      where: { id: evidence.id },
      data: {
        registeredBlockHeight: block.height,
        registeredTxHash: transaction.txHash,
      },
    });

    wallet = await spendDemoFee(wallet, FEES.REGISTER_EVIDENCE, "REGISTER_EVIDENCE");
    createdEvidence.push(updatedEvidence);
  }

  const originalEvidence = createdEvidence[0];

  if (originalEvidence) {
    const verifiedAt = new Date().toISOString();

    await prisma.verification.create({
      data: {
        evidenceId: originalEvidence.id,
        providedHash: originalEvidence.sha256Hash,
        originalHash: originalEvidence.sha256Hash,
        matched: true,
        chainValid: true,
        signaturesValid: true,
        integrityScore: 100,
        notes: "Demo verification using matching file content.",
      },
    });

    await createLedgerBlock({
      type: "VERIFY_EVIDENCE",
      payload: {
        evidenceId: originalEvidence.id,
        originalHash: originalEvidence.sha256Hash,
        providedHash: originalEvidence.sha256Hash,
        matched: true,
        chainValid: true,
        integrityScore: 100,
        verifiedAt,
        demo: true,
      },
      signerPublicKey: getSignerPublicKey(user),
      feeAmount: FEES.VERIFY_EVIDENCE,
    });

    wallet = await spendDemoFee(wallet, FEES.VERIFY_EVIDENCE, "VERIFY_EVIDENCE");

    const timestamp = new Date().toISOString();
    const previousEventHash = originalEvidence.registeredTxHash || "";
    const custodyPayload = {
      evidenceId: originalEvidence.id,
      action: "COLLECTED",
      actorName: user.name || "Local Investigator",
      actorRole: user.role || "Investigator",
      notes: "Demo collection event.",
      previousEventHash,
      timestamp,
      demo: true,
    };
    const eventHash = sha256String(stableJson(custodyPayload));

    const { block, transaction } = await createLedgerBlock({
      type: "ADD_CUSTODY_EVENT",
      payload: custodyPayload,
      signerPublicKey: getSignerPublicKey(user),
      feeAmount: FEES.ADD_CUSTODY_EVENT,
    });

    await prisma.custodyEvent.create({
      data: {
        evidenceId: originalEvidence.id,
        actorId: user.id,
        action: "COLLECTED",
        notes: "Demo collection event.",
        actorName: user.name || "Local Investigator",
        actorRole: user.role || "Investigator",
        publicKey: getSignerPublicKey(user),
        signature: null,
        previousEventHash,
        eventHash,
        blockHeight: block.height,
        txHash: transaction.txHash,
      },
    });

    wallet = await spendDemoFee(wallet, FEES.ADD_CUSTODY_EVENT, "ADD_CUSTODY_EVENT");
  }

  revalidateDemoPaths(caseItem.id, originalEvidence?.id);
  redirect("/demo");
}

export async function resetDemoData() {
  await requireCurrentUser();

  const demoCases = await prisma.case.findMany({
    where: { title: { startsWith: DEMO_CASE_TITLE_PREFIX } },
    select: { id: true },
  });
  const demoCaseIds = demoCases.map((caseItem) => caseItem.id);

  if (demoCaseIds.length > 0) {
    const demoEvidence = await prisma.evidenceItem.findMany({
      where: { caseId: { in: demoCaseIds } },
      select: { id: true },
    });
    const demoEvidenceIds = demoEvidence.map((evidence) => evidence.id);

    await prisma.$transaction(async (tx) => {
      if (demoEvidenceIds.length > 0) {
        await tx.verification.deleteMany({
          where: { evidenceId: { in: demoEvidenceIds } },
        });
        await tx.custodyEvent.deleteMany({
          where: { evidenceId: { in: demoEvidenceIds } },
        });
        await tx.evidenceItem.deleteMany({
          where: { id: { in: demoEvidenceIds } },
        });
      }

      await tx.case.deleteMany({
        where: { id: { in: demoCaseIds } },
      });
    });
  }

  await rm(DEMO_STORAGE_DIR, { recursive: true, force: true });

  revalidateDemoPaths();
  redirect("/demo");
}
