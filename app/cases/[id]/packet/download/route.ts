import { NextResponse } from "next/server";
import { getCasePacketData } from "@/lib/cases/packet";
import { createCasePacketPdf } from "@/lib/cases/packetPdf";

export const runtime = "nodejs";

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9.\-_]+/gi, "-").slice(0, 80) || "case";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const packet = await getCasePacketData(id);

  if (!packet) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const pdfBytes = await createCasePacketPdf(packet);
  const fileName = safeFileName(packet.caseItem.title);

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="forensicvault-case-packet-${fileName}.pdf"`,
      "Content-Length": String(pdfBytes.length),
    },
  });
}
