"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth/requirePermission";
import { countAdminUsers } from "@/lib/auth/adminBootstrap";
import { isUserRole, normalizeRole } from "@/lib/auth/roles";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { prisma } from "@/lib/prisma";

export async function updateUserRole(formData: FormData) {
  const currentUser = await assertPermission(
    "CHANGE_USER_ROLES",
    "Your current local role does not allow changing user roles.",
  );

  const userId = String(formData.get("userId") || "").trim();
  const roleInput = String(formData.get("role") || "").trim();

  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!isUserRole(roleInput)) {
    await recordAuditEventSafe({
      ...getAuditActorFromUser(currentUser),
      action: AUDIT_ACTIONS.USER_ROLE_CHANGE_DENIED,
      category: "ROLE",
      severity: "WARNING",
      outcome: "DENIED",
      targetType: "User",
      targetId: userId,
      summary: "User role change denied: invalid role",
      metadata: { changedUserId: userId, requestedRole: roleInput },
    });
    throw new Error("Invalid role selection.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, name: true },
  });

  if (!targetUser) {
    throw new Error("User not found.");
  }

  const currentTargetRole = normalizeRole(targetUser.role);
  const nextRole = roleInput;

  if (currentTargetRole === "ADMIN" && nextRole !== "ADMIN") {
    const adminCount = await countAdminUsers();
    if (adminCount <= 1) {
      await recordAuditEventSafe({
        ...getAuditActorFromUser(currentUser),
        action: AUDIT_ACTIONS.LAST_ADMIN_DEMOTION_BLOCKED,
        category: "ROLE",
        severity: "HIGH",
        outcome: "DENIED",
        targetType: "User",
        targetId: targetUser.id,
        targetLabel: targetUser.name,
        summary: "Last admin demotion blocked",
        metadata: {
          changedUserId: targetUser.id,
          changedUserEmail: targetUser.email,
          oldRole: currentTargetRole,
          newRole: nextRole,
        },
      });
      throw new Error("Cannot demote the last local Admin.");
    }
  }

  if (
    targetUser.id === currentUser.id &&
    currentTargetRole === "ADMIN" &&
    nextRole !== "ADMIN"
  ) {
    const adminCount = await countAdminUsers();
    if (adminCount <= 1) {
      await recordAuditEventSafe({
        ...getAuditActorFromUser(currentUser),
        action: AUDIT_ACTIONS.LAST_ADMIN_DEMOTION_BLOCKED,
        category: "ROLE",
        severity: "HIGH",
        outcome: "DENIED",
        targetType: "User",
        targetId: targetUser.id,
        targetLabel: targetUser.name,
        summary: "Self-demotion blocked while only admin",
        metadata: {
          changedUserId: targetUser.id,
          changedUserEmail: targetUser.email,
          oldRole: currentTargetRole,
          newRole: nextRole,
        },
      });
      throw new Error("You cannot demote yourself while you are the only local Admin.");
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: nextRole },
  });

  await recordAuditEventSafe({
    ...getAuditActorFromUser(currentUser),
    action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
    category: "ROLE",
    severity: "NOTICE",
    outcome: "SUCCESS",
    targetType: "User",
    targetId: targetUser.id,
    targetLabel: targetUser.name,
    summary: `User role changed: ${targetUser.name} → ${nextRole}`,
    metadata: {
      changedUserId: targetUser.id,
      changedUserEmail: targetUser.email,
      oldRole: currentTargetRole,
      newRole: nextRole,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/guard");
}
