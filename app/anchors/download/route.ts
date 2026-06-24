import type { NextRequest } from "next/server";
import {
  formatAnchorDate,
  getAnchorExport,
} from "@/lib/anchors/anchor";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { denyUnlessDownloadPermission } from "@/lib/auth/downloadAccess";
import { getCurrentUserWithRole } from "@/lib/auth/requirePermission";

export async function GET(request: NextRequest) {
  const denied = await denyUnlessDownloadPermission("VIEW_ANCHORS", request);
  if (denied) return denied;

  const anchor = await getAnchorExport();
  const fileDate = formatAnchorDate(new Date(anchor.generatedAt));
  const session = await getCurrentUserWithRole();

  await recordAuditEventSafe({
    ...(session ? getAuditActorFromUser(session.user) : {}),
    action: AUDIT_ACTIONS.ANCHOR_EXPORTED_JSON,
    category: "ANCHOR",
    severity: "NOTICE",
    outcome: "SUCCESS",
    route: "/anchors/download",
    method: "GET",
    summary: "Anchor exported as JSON",
    metadata: {
      latestBlockHeight: anchor.latestBlockHeight,
      latestBlockHash: anchor.latestBlockHash,
      ledgerRoot: anchor.ledgerRoot,
    },
  });

  return new Response(JSON.stringify(anchor, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="forensicvault-anchor-${fileDate}.json"`,
    },
  });
}
