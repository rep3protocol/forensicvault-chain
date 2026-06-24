import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { getCurrentUserWithRole } from "@/lib/auth/requirePermission";
import { loadDiagnosticRun } from "@/lib/dev/diagnostics/store";
import { isOwnerUser } from "@/lib/dev/owner";

export async function GET() {
  const session = await getCurrentUserWithRole();
  if (!session || !isOwnerUser(session.user)) {
    return new Response("Forbidden", { status: 403 });
  }

  const run = await loadDiagnosticRun();
  if (!run) {
    return new Response(JSON.stringify({ error: "No diagnostic run found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  await recordAuditEventSafe({
    ...getAuditActorFromUser(session.user),
    action: AUDIT_ACTIONS.DEV_DIAGNOSTIC_RUN,
    category: "SYSTEM",
    severity: "INFO",
    outcome: "SUCCESS",
    route: "/dev/diagnostics/download",
    method: "GET",
    summary: "Diagnostic report exported as JSON",
    metadata: {
      overallStatus: run.overallStatus,
      goCount: run.goCount,
      warningCount: run.warningCount,
      noGoCount: run.noGoCount,
    },
  });

  return new Response(JSON.stringify(run, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="forensicvault-diagnostics-${run.runId}.json"`,
    },
  });
}
