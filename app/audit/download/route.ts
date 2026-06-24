import type { NextRequest } from "next/server";
import { getAuditLogs } from "@/lib/audit/query";
import { validateAuditLogChain } from "@/lib/audit/validation";
import {
  getAuditActorFromUser,
  recordAuditEvent,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { denyUnlessDownloadPermission } from "@/lib/auth/downloadAccess";

export async function GET(request: NextRequest) {
  const denied = await denyUnlessDownloadPermission("EXPORT_AUDIT_LOG", request);
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const filters = {
    q: searchParams.get("q")?.trim() || undefined,
    category: searchParams.get("category")?.trim() || undefined,
    action: searchParams.get("action")?.trim() || undefined,
    severity: searchParams.get("severity")?.trim() || undefined,
    outcome: searchParams.get("outcome")?.trim() || undefined,
    targetType: searchParams.get("targetType")?.trim() || undefined,
    from: searchParams.get("from")?.trim() || undefined,
    to: searchParams.get("to")?.trim() || undefined,
    page: 1,
    pageSize: 200,
  };

  const [validation, logs] = await Promise.all([
    validateAuditLogChain(),
    getAuditLogs({ ...filters, pageSize: 10_000 }),
  ]);

  const session = await import("@/lib/auth/requirePermission").then((mod) =>
    mod.getCurrentUserWithRole(),
  );

  await recordAuditEvent({
    ...(session ? getAuditActorFromUser(session.user) : {}),
    action: AUDIT_ACTIONS.AUDIT_LOG_EXPORTED,
    category: "SYSTEM",
    severity: "NOTICE",
    outcome: "SUCCESS",
    route: "/audit/download",
    method: "GET",
    summary: "Audit log exported as JSON",
    metadata: {
      eventCount: logs.total,
      filtersApplied: Boolean(
        filters.q ||
          filters.category ||
          filters.action ||
          filters.severity ||
          filters.outcome ||
          filters.targetType ||
          filters.from ||
          filters.to,
      ),
      auditChainValid: validation.valid,
    },
  });

  const generatedAt = new Date().toISOString();
  const payload = {
    app: "ForensicVault Chain",
    exportType: "AUDIT_LOG",
    environment: "LOCAL_TESTNET",
    warning: "LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.",
    generatedAt,
    validation: {
      valid: validation.valid,
      totalEvents: validation.totalEvents,
      checkedEvents: validation.checkedEvents,
      errors: validation.errors,
      latestSequence: validation.latestSequence,
      latestAuditHash: validation.latestAuditHash,
    },
    filters,
    events: logs.events.map((event) => ({
      ...event,
      timestamp: event.timestamp.toISOString(),
      createdAt: event.createdAt.toISOString(),
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="forensicvault-audit-log-${generatedAt.slice(0, 10)}.json"`,
    },
  });
}
