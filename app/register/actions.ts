"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { hashPassword } from "@/lib/auth/password";
import { isUserRole } from "@/lib/auth/roles";
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
  const roleInput = String(formData.get("role") || "INVESTIGATOR").trim();
  const role =
    isUserRole(roleInput) && roleInput !== "ADMIN" ? roleInput : "INVESTIGATOR";

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

  await recordAuditEventSafe({
    ...getAuditActorFromUser(user),
    action: AUDIT_ACTIONS.USER_REGISTERED,
    category: "AUTH",
    severity: "NOTICE",
    outcome: "SUCCESS",
    targetType: "User",
    targetId: user.id,
    targetLabel: user.name,
    route: "/register",
    summary: `User registered: ${user.name}`,
    metadata: { role: user.role },
  });

  redirect("/");
}
