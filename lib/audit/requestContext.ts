import { headers } from "next/headers";

export async function getAuditRequestContext() {
  const headerStore = await headers();

  return {
    route: headerStore.get("x-pathname") ?? headerStore.get("referer"),
    userAgent: headerStore.get("user-agent"),
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip"),
    method: headerStore.get("x-method") ?? "SERVER_ACTION",
  };
}
