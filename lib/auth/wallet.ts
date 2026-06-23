import { randomBytes } from "node:crypto";
import type { User } from "@prisma/client";
import { DEFAULT_PUBLIC_KEY, DEFAULT_WALLET_ADDRESS } from "@/lib/token/testVault";
import { prisma } from "@/lib/prisma";

function randomLocalHex(prefix: string) {
  return `${prefix}_${randomBytes(16).toString("hex")}`;
}

export async function ensureWalletForUser(user: Pick<User, "id" | "name" | "publicKey">) {
  const existing = await prisma.wallet.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing;
  }

  return prisma.wallet.create({
    data: {
      label: `${user.name} TEST_VAULT Wallet`,
      address: randomLocalHex("fv-wallet-local"),
      publicKey: user.publicKey || randomLocalHex("LOCAL_DEV_PUBLIC_KEY"),
      balance: 1000,
      userId: user.id,
    },
  });
}

export async function getWalletForUserOrDefault(user: Pick<User, "id" | "name" | "publicKey"> | null) {
  if (user) {
    return ensureWalletForUser(user);
  }

  return prisma.wallet.findUnique({
    where: { address: DEFAULT_WALLET_ADDRESS },
  });
}

export function getSignerPublicKey(user: Pick<User, "publicKey"> | null | undefined) {
  return user?.publicKey || DEFAULT_PUBLIC_KEY;
}
