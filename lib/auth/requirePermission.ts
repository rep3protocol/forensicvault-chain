import { redirect } from "next/navigation";
import type { Permission } from "@/lib/auth/permissions";
import { can, canAny } from "@/lib/auth/permissions";
import { normalizeRole } from "@/lib/auth/roles";
import { getCurrentUser, requireCurrentUser } from "@/lib/auth/session";
import type { User } from "@prisma/client";

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

export async function requirePermission(permission: Permission): Promise<User> {
  const session = await getCurrentUserWithRole();
  if (!session) {
    redirect("/login");
  }

  if (!can(session.role, permission)) {
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
    throw new Error(message);
  }
  return user;
}
