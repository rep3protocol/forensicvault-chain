import { normalizeRole, resolveRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export type RoleAuditSummary = {
  totalUsers: number;
  adminCount: number;
  unrecognizedRoleCount: number;
  lastAdminProtected: boolean;
};

export async function getRoleAuditSummary(): Promise<RoleAuditSummary> {
  const users = await prisma.user.findMany({
    select: { role: true },
  });

  let adminCount = 0;
  let unrecognizedRoleCount = 0;

  for (const user of users) {
    const resolution = resolveRole(user.role);
    if (resolution.role === "ADMIN") {
      adminCount += 1;
    }
    if (!resolution.recognized) {
      unrecognizedRoleCount += 1;
    }
  }

  return {
    totalUsers: users.length,
    adminCount,
    unrecognizedRoleCount,
    lastAdminProtected: adminCount >= 1,
  };
}

export function userHasAdminRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "ADMIN";
}
