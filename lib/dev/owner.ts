import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { normalizeRole } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

export function isOwnerDevToolsEnabled() {
  return process.env.FORENSICVAULT_OWNER_DEV_TOOLS === "true";
}

export function isOwnerUser(user: Pick<User, "name" | "email" | "role">) {
  if (!isOwnerDevToolsEnabled()) {
    return false;
  }

  if (normalizeRole(user.role) !== "ADMIN") {
    return false;
  }

  const ownerEmail = process.env.FORENSICVAULT_OWNER_EMAIL?.trim();
  const ownerName = process.env.FORENSICVAULT_OWNER_NAME?.trim();

  if (ownerEmail) {
    return (user.email ?? "").toLowerCase() === ownerEmail.toLowerCase();
  }

  if (ownerName) {
    return user.name === ownerName;
  }

  return process.env.NODE_ENV === "development";
}

export function canViewOwnerDiagnostics(
  user: Pick<User, "name" | "email" | "role"> | null | undefined,
) {
  if (!user) return false;
  return isOwnerUser(user);
}

export async function requireOwnerDevToolAccess() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!isOwnerUser(user)) {
    redirect("/forbidden");
  }

  return user;
}
