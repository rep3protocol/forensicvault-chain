import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await prisma.user.upsert({
    where: {
      publicKey: "LOCAL_DEV_PUBLIC_KEY",
    },
    update: {},
    create: {
      name: "Local Investigator",
      role: "Investigator",
      publicKey: "LOCAL_DEV_PUBLIC_KEY",
    },
  });

  const wallet = await prisma.wallet.upsert({
    where: {
      address: "fv-wallet-local-default",
    },
    update: {},
    create: {
      label: "Local TEST_VAULT Wallet",
      address: "fv-wallet-local-default",
      publicKey: "LOCAL_DEV_PUBLIC_KEY",
      balance: 1000,
    },
  });

  return NextResponse.json({
    status: "seeded",
    user,
    wallet,
    warning: "TEST_VAULT is a fake local test token with no real value.",
  });
}
