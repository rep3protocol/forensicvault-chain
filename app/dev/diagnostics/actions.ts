"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { assertPermission } from "@/lib/auth/requirePermission";
import { runOwnerDiagnostics } from "@/lib/dev/diagnostics/run";
import { saveDiagnosticRun } from "@/lib/dev/diagnostics/store";
import { requireOwnerDevToolAccess } from "@/lib/dev/owner";

export async function runDiagnosticsAction() {
  const user = await requireOwnerDevToolAccess();
  await assertPermission(
    "RUN_DEV_DIAGNOSTICS",
    "Your current local role does not allow running diagnostics.",
  );

  const run = await runOwnerDiagnostics({
    mode: "readOnly",
    user,
  });
  await saveDiagnosticRun(run);

  await recordAuditEventSafe({
    ...getAuditActorFromUser(user),
    action: AUDIT_ACTIONS.DEV_DIAGNOSTIC_RUN,
    category: "SYSTEM",
    severity: run.overallStatus === "NO_GO" ? "HIGH" : "NOTICE",
    outcome: run.overallStatus === "NO_GO" ? "FAILURE" : "SUCCESS",
    route: "/dev/diagnostics",
    summary: `Owner diagnostics run: ${run.overallStatus}`,
    metadata: {
      overallStatus: run.overallStatus,
      goCount: run.goCount,
      warningCount: run.warningCount,
      noGoCount: run.noGoCount,
      skippedCount: run.skippedCount,
      durationMs: run.durationMs,
    },
  });

  revalidatePath("/dev/diagnostics");
  redirect("/dev/diagnostics?ran=1");
}
