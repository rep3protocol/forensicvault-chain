import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

const LOCAL_EMAIL = "local@forensicvault.dev";
const LOCAL_PASSWORD = "localdev123";

export async function GET() {
  const user = await prisma.user.upsert({
    where: {
      publicKey: "LOCAL_DEV_PUBLIC_KEY",
    },
    update: {
      email: LOCAL_EMAIL,
      passwordHash: hashPassword(LOCAL_PASSWORD),
    },
    create: {
      name: "Local Investigator",
      email: LOCAL_EMAIL,
      passwordHash: hashPassword(LOCAL_PASSWORD),
      role: "Investigator",
      publicKey: "LOCAL_DEV_PUBLIC_KEY",
    },
  });

  const wallet = await prisma.wallet.upsert({
    where: {
      address: "fv-wallet-local-default",
    },
    update: {
      userId: user.id,
    },
    create: {
      label: "Local TEST_VAULT Wallet",
      address: "fv-wallet-local-default",
      publicKey: "LOCAL_DEV_PUBLIC_KEY",
      balance: 1000,
      userId: user.id,
    },
  });

  return NextResponse.json({
    status: "seeded",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      publicKey: user.publicKey,
    },
    wallet,
    credentials: {
      email: LOCAL_EMAIL,
      password: LOCAL_PASSWORD,
    },
    warning: "TEST_VAULT is a fake local test token with no real value.",
  });
}
