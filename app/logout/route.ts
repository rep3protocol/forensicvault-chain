import { redirect } from "next/navigation";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();

  if (user) {
    await recordAuditEventSafe({
      ...getAuditActorFromUser(user),
      action: AUDIT_ACTIONS.USER_LOGGED_OUT,
      category: "AUTH",
      severity: "INFO",
      outcome: "SUCCESS",
      targetType: "User",
      targetId: user.id,
      targetLabel: user.name,
      route: "/logout",
      summary: `User logged out: ${user.name}`,
    });
  }

  await clearSessionCookie();
  redirect("/login");
}
