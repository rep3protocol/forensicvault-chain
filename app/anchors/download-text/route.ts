import type { NextRequest } from "next/server";
import {
  formatAnchorDate,
  getAnchorExport,
  getAnchorText,
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
    action: AUDIT_ACTIONS.ANCHOR_EXPORTED_TEXT,
    category: "ANCHOR",
    severity: "NOTICE",
    outcome: "SUCCESS",
    route: "/anchors/download-text",
    method: "GET",
    summary: "Anchor exported as text",
    metadata: {
      latestBlockHeight: anchor.latestBlockHeight,
      latestBlockHash: anchor.latestBlockHash,
      ledgerRoot: anchor.ledgerRoot,
    },
  });

  return new Response(getAnchorText(anchor), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="forensicvault-anchor-${fileDate}.txt"`,
    },
  });
}
