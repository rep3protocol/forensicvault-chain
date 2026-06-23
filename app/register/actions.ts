"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { ensureWalletForUser } from "@/lib/auth/wallet";
import { prisma } from "@/lib/prisma";

function localPublicKey() {
  return `LOCAL_DEV_PUBLIC_KEY_${randomBytes(16).toString("hex")}`;
}

export async function register(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "Investigator").trim() || "Investigator";

  if (!name) throw new Error("Name is required.");
  if (!email) throw new Error("Email is required.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  const existing = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    throw new Error("A local user with that email already exists.");
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role,
      publicKey: localPublicKey(),
    },
  });

  await ensureWalletForUser(user);
  await createSessionCookie(user.id);
  redirect("/");
}
