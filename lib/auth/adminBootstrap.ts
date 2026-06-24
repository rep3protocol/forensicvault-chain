import { normalizeRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export async function countAdminUsers(): Promise<number> {
  const users = await prisma.user.findMany({
    select: { role: true },
  });

  return users.filter((user) => normalizeRole(user.role) === "ADMIN").length;
}

/** Seed-only helper: ensure at least one local Admin exists. */
export async function ensureAtLeastOneAdmin(): Promise<void> {
  const adminCount = await countAdminUsers();
  if (adminCount > 0) return;

  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!firstUser) return;

  await prisma.user.update({
    where: { id: firstUser.id },
    data: { role: "ADMIN" },
  });
}
