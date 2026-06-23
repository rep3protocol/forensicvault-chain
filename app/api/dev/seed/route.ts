import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

const DEFAULT_LOCAL_EMAIL = "local@forensicvault.dev";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Local development seeding is disabled in production." },
      { status: 403 },
    );
  }

  const localEmail = process.env.LOCAL_DEV_SEED_EMAIL?.trim() || DEFAULT_LOCAL_EMAIL;
  const localPassword = process.env.LOCAL_DEV_SEED_PASSWORD;

  if (!localPassword) {
    return NextResponse.json(
      {
        error:
          "LOCAL_DEV_SEED_PASSWORD is required for local development seeding. Set it in .env and try again.",
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.upsert({
    where: {
      publicKey: "LOCAL_DEV_PUBLIC_KEY",
    },
    update: {
      email: localEmail,
      passwordHash: hashPassword(localPassword),
    },
    create: {
      name: "Local Investigator",
      email: localEmail,
      passwordHash: hashPassword(localPassword),
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
      email: localEmail,
      password: "Configured by LOCAL_DEV_SEED_PASSWORD in .env",
    },
    warning: "TEST_VAULT is a fake local test token with no real value.",
  });
}
