import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { denyUnlessDownloadPermission } from "@/lib/auth/downloadAccess";
import { getCurrentUserWithRole } from "@/lib/auth/requirePermission";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { getCasePacketData } from "@/lib/cases/packet";
import { createCasePacketPdf } from "@/lib/cases/packetPdf";

export const runtime = "nodejs";

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9.\-_]+/gi, "-").slice(0, 80) || "case";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const denied = await denyUnlessDownloadPermission("EXPORT_CASE_PACKET", request);
  if (denied) return denied;

  const { id } = await context.params;
  const packet = await getCasePacketData(id);

  if (!packet) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const session = await getCurrentUserWithRole();
  const fileName = safeFileName(packet.caseItem.title);

  await recordAuditEventSafe({
    ...(session ? getAuditActorFromUser(session.user) : {}),
    action: AUDIT_ACTIONS.CASE_PACKET_EXPORTED,
    category: "CASE_PACKET",
    severity: "NOTICE",
    outcome: "SUCCESS",
    targetType: "Case",
    targetId: packet.caseItem.id,
    targetLabel: packet.caseItem.title,
    route: `/cases/${id}/packet/download`,
    method: "GET",
    summary: `Case packet exported: ${packet.caseItem.title}`,
    metadata: {
      caseId: packet.caseItem.id,
      filename: `forensicvault-case-packet-${fileName}.pdf`,
      evidenceCount: packet.integritySummary.totalEvidenceItems,
    },
  });

  const pdfBytes = await createCasePacketPdf(packet);

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="forensicvault-case-packet-${fileName}.pdf"`,
      "Content-Length": String(pdfBytes.length),
    },
  });
}
