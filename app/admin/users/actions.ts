"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth/requirePermission";
import { countAdminUsers } from "@/lib/auth/adminBootstrap";
import { isUserRole, normalizeRole } from "@/lib/auth/roles";
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
    throw new Error("Invalid role selection.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!targetUser) {
    throw new Error("User not found.");
  }

  const currentTargetRole = normalizeRole(targetUser.role);
  const nextRole = roleInput;

  if (currentTargetRole === "ADMIN" && nextRole !== "ADMIN") {
    const adminCount = await countAdminUsers();
    if (adminCount <= 1) {
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
      throw new Error("You cannot demote yourself while you are the only local Admin.");
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: nextRole },
  });

  revalidatePath("/admin/users");
  revalidatePath("/guard");
}
