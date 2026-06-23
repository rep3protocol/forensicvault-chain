"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSignerPublicKey, getWalletForUserOrDefault } from "@/lib/auth/wallet";
import { sha256String, stableJson } from "@/lib/crypto/hash";
import { createLedgerBlock } from "@/lib/ledger/createBlock";
import { prisma } from "@/lib/prisma";

const LOCAL_VALIDATOR = "LOCAL_DEV_VALIDATOR";
const CUSTODY_FEE = 3;

export async function addCustodyEvent(evidenceId: string, formData: FormData) {
  const evidence = await prisma.evidenceItem.findUnique({
    where: { id: evidenceId },
  });

  if (!evidence) {
    throw new Error("Evidence item not found.");
  }

  const action = String(formData.get("action") || "").trim();
  const currentUser = await getCurrentUser();
  const actorName = String(formData.get("actorName") || "").trim() || currentUser?.name || "";
  const actorRole = String(formData.get("actorRole") || "").trim() || currentUser?.role || "";
  const notes = String(formData.get("notes") || "").trim();

  if (!action) throw new Error("Custody action is required.");
  if (!actorName) throw new Error("Actor name is required.");
  if (!actorRole) throw new Error("Actor role is required.");

  const latestEvent = await prisma.custodyEvent.findFirst({
    where: { evidenceId },
    orderBy: { createdAt: "desc" },
  });

  const previousEventHash =
    latestEvent?.eventHash || evidence.registeredTxHash || "";

  const timestamp = new Date().toISOString();

  const custodyPayload = {
    evidenceId,
    action,
    actorName,
    actorRole,
    notes,
    previousEventHash,
    timestamp,
  };

  const eventHash = sha256String(stableJson(custodyPayload));

  const wallet = await getWalletForUserOrDefault(currentUser);

  if (!wallet) {
    throw new Error("Default TEST_VAULT wallet not found. Visit /api/dev/seed first.");
  }

  if (wallet.balance < CUSTODY_FEE) {
    throw new Error(
      `Insufficient TEST_VAULT balance. Required: ${CUSTODY_FEE}. Available: ${wallet.balance}.`
    );
  }

  const { block, transaction } = await createLedgerBlock({
    type: "ADD_CUSTODY_EVENT",
    payload: custodyPayload,
    signerPublicKey: getSignerPublicKey(currentUser),
    feeAmount: CUSTODY_FEE,
  });

  await prisma.custodyEvent.create({
    data: {
      evidenceId,
      action,
      notes: notes || null,
      actorName,
      actorRole,
      actorId: currentUser?.id ?? null,
      publicKey: getSignerPublicKey(currentUser),
      signature: null,
      previousEventHash,
      eventHash,
      blockHeight: block.height,
      txHash: transaction.txHash,
    },
  });

  await prisma.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: wallet.balance - CUSTODY_FEE,
    },
  });

  await prisma.tokenTransaction.create({
    data: {
      fromWallet: wallet.address,
      toWallet: LOCAL_VALIDATOR,
      amount: CUSTODY_FEE,
      type: "SPEND_TEST_VAULT",
      reason: "ADD_CUSTODY_EVENT",
    },
  });

  redirect(`/evidence/${evidenceId}`);
}
