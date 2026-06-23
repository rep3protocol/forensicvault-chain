"use server";

import { redirect } from "next/navigation";
import { createSessionCookie } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { ensureWalletForUser } from "@/lib/auth/wallet";
import { prisma } from "@/lib/prisma";

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid local credentials.");
  }

  await ensureWalletForUser(user);
  await createSessionCookie(user.id);
  redirect("/");
}
