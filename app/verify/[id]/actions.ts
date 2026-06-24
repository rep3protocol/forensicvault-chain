"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/auth/requirePermission";
import { getSignerPublicKey, getWalletForUserOrDefault } from "@/lib/auth/wallet";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { sha256Buffer } from "@/lib/crypto/hash";
import { createLedgerBlock } from "@/lib/ledger/createBlock";
import { calculateIntegrityScore } from "@/lib/ledger/integrityScore";
import { validateLedgerChain } from "@/lib/ledger/validateChain";
import { prisma } from "@/lib/prisma";
import {
  ensureSufficientBalance,
  FEES,
  getFee,
} from "@/lib/token/testVault";

const VALIDATOR_ADDRESS = "LOCAL_DEV_VALIDATOR";

export async function verifyEvidence(evidenceId: string, formData: FormData) {
  const currentUser = await assertPermission(
    "VERIFY_EVIDENCE",
    "Your current local role does not allow verifying evidence.",
  );

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A comparison file is required.");
  }

  const evidence = await prisma.evidenceItem.findUnique({
    where: { id: evidenceId },
    include: { case: { select: { id: true, title: true } } },
  });

  if (!evidence) {
    throw new Error("Evidence not found.");
  }

  const wallet = await getWalletForUserOrDefault(currentUser);

  if (!wallet) {
    throw new Error(
      'Default wallet not found. Run GET /api/dev/seed before verifying evidence.',
    );
  }

  const fee = getFee("VERIFY_EVIDENCE");
  ensureSufficientBalance(wallet.balance, fee);

  const buffer = Buffer.from(await file.arrayBuffer());
  const providedHash = sha256Buffer(buffer);
  const matched = providedHash === evidence.sha256Hash;

  const { valid: chainValid, errors: chainErrors } =
    await validateLedgerChain();

  const integrityScore = calculateIntegrityScore({
    hashMatched: matched,
    chainValid,
    custodyChainValid: true,
    hasRegistrationBlock: evidence.registeredBlockHeight != null,
    hasVerification: true,
  });

  const notes =
    chainErrors.length > 0
      ? `Ledger validation errors: ${chainErrors.join(" ")}`
      : null;

  const verifiedAt = new Date().toISOString();

  await prisma.$transaction(async (tx) => {
    await tx.verification.create({
      data: {
        evidenceId,
        providedHash,
        originalHash: evidence.sha256Hash,
        matched,
        chainValid,
        signaturesValid: true,
        integrityScore,
        notes,
      },
    });

    await createLedgerBlock(
      {
        type: "VERIFY_EVIDENCE",
        payload: {
          evidenceId,
          originalHash: evidence.sha256Hash,
          providedHash,
          matched,
          chainValid,
          integrityScore,
          verifiedAt,
        },
        signerPublicKey: getSignerPublicKey(currentUser),
        feeAmount: FEES.VERIFY_EVIDENCE,
      },
      tx,
    );

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
        reason: "VERIFY_EVIDENCE",
      },
    });
  });

  const verification = await prisma.verification.findFirst({
    where: { evidenceId },
    orderBy: { createdAt: "desc" },
  });

  await recordAuditEventSafe({
    ...getAuditActorFromUser(currentUser),
    action: matched
      ? AUDIT_ACTIONS.EVIDENCE_VERIFICATION_MATCHED
      : AUDIT_ACTIONS.EVIDENCE_VERIFICATION_FAILED,
    category: "VERIFICATION",
    severity: matched ? "NOTICE" : "WARNING",
    outcome: matched ? "SUCCESS" : "FAILURE",
    targetType: "EvidenceItem",
    targetId: evidenceId,
    targetLabel: evidence.originalName,
    summary: matched
      ? `Evidence verification matched: ${evidence.originalName}`
      : `Evidence verification failed: ${evidence.originalName}`,
    metadata: {
      evidenceId,
      evidenceName: evidence.originalName,
      caseId: evidence.caseId,
      providedHash,
      originalHash: evidence.sha256Hash,
      matched,
      integrityScore,
      chainValid,
      signaturesValid: true,
      tokenFee: fee,
      verificationId: verification?.id ?? null,
    },
  });

  revalidatePath("/verify");
  revalidatePath(`/verify/${evidenceId}`);
  revalidatePath("/");
  revalidatePath("/ledger");
  revalidatePath("/wallet");
  revalidatePath(`/cases/${evidence.caseId}`);
  redirect(`/verify/${evidenceId}?verified=1`);
}
