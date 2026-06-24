import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Permission } from "@/lib/auth/permissions";
import { can } from "@/lib/auth/permissions";
import { getCurrentUserWithRole } from "@/lib/auth/requirePermission";

export async function denyUnlessDownloadPermission(
  permission: Permission,
  request: NextRequest,
) {
  const session = await getCurrentUserWithRole();
  if (!session || !can(session.role, permission)) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }
  return null;
}
