"use server";

import { redirect } from "next/navigation";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
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
    await recordAuditEventSafe({
      actorEmail: email || null,
      action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
      category: "AUTH",
      severity: "WARNING",
      outcome: "FAILURE",
      route: "/login",
      summary: "Failed local login attempt",
      metadata: { attemptedEmail: email || null },
    });
    throw new Error("Invalid local credentials.");
  }

  await ensureWalletForUser(user);
  await createSessionCookie(user.id);

  await recordAuditEventSafe({
    ...getAuditActorFromUser(user),
    action: AUDIT_ACTIONS.USER_LOGGED_IN,
    category: "AUTH",
    severity: "NOTICE",
    outcome: "SUCCESS",
    targetType: "User",
    targetId: user.id,
    targetLabel: user.name,
    route: "/login",
    summary: `User logged in: ${user.name}`,
  });

  redirect("/");
}
