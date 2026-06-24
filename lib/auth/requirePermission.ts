import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Permission } from "@/lib/auth/permissions";
import { can, canAny } from "@/lib/auth/permissions";
import { normalizeRole } from "@/lib/auth/roles";
import { getCurrentUser, requireCurrentUser } from "@/lib/auth/session";
import type { User } from "@prisma/client";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { getAuditRequestContext } from "@/lib/audit/requestContext";
import { AUDIT_ACTIONS } from "@/lib/audit/types";

export type CurrentUserWithRole = {
  user: User;
  role: ReturnType<typeof normalizeRole>;
};

export async function getCurrentUserWithRole(): Promise<CurrentUserWithRole | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  return {
    user,
    role: normalizeRole(user.role),
  };
}

export function forbidden(): never {
  redirect("/forbidden");
}

async function logPermissionDenied(
  session: CurrentUserWithRole,
  permission: Permission | string,
  route?: string | null,
) {
  const ctx = await getAuditRequestContext();
  await recordAuditEventSafe({
    ...getAuditActorFromUser(session.user),
    action: AUDIT_ACTIONS.PERMISSION_DENIED,
    category: "PERMISSION",
    severity: "WARNING",
    outcome: "DENIED",
    permission,
    route: route ?? ctx.route ?? null,
    method: ctx.method,
    ipAddress: ctx.ipAddress ?? null,
    userAgent: ctx.userAgent ?? null,
    summary: `Permission denied for ${permission}`,
    metadata: { permission },
  });
}

export async function requirePermission(permission: Permission): Promise<User> {
  const session = await getCurrentUserWithRole();
  if (!session) {
    redirect("/login");
  }

  if (!can(session.role, permission)) {
    const headerStore = await headers();
    const pathname = headerStore.get("x-invoke-path") ?? headerStore.get("referer");
    await logPermissionDenied(session, permission, pathname);
    forbidden();
  }

  return session.user;
}

export async function requireAnyPermission(
  permissions: readonly Permission[],
): Promise<User> {
  const session = await getCurrentUserWithRole();
  if (!session) {
    redirect("/login");
  }

  if (!canAny(session.role, permissions)) {
    const headerStore = await headers();
    const pathname = headerStore.get("x-invoke-path") ?? headerStore.get("referer");
    await logPermissionDenied(session, permissions.join(","), pathname);
    forbidden();
  }

  return session.user;
}

export async function assertPermission(
  permission: Permission,
  message = "Your current local role does not allow this action.",
): Promise<User> {
  const user = await requireCurrentUser();
  if (!can(user.role, permission)) {
    const session = { user, role: normalizeRole(user.role) };
    await logPermissionDenied(session, permission);
    throw new Error(message);
  }
  return user;
}

export async function assertAnyPermission(
  permissions: readonly Permission[],
  message = "Your current local role does not allow this action.",
): Promise<User> {
  const user = await requireCurrentUser();
  if (!canAny(user.role, permissions)) {
    const session = { user, role: normalizeRole(user.role) };
    await logPermissionDenied(session, permissions.join(","));
    throw new Error(message);
  }
  return user;
}
