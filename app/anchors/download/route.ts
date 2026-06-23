import {
  formatAnchorDate,
  getAnchorExport,
} from "@/lib/anchors/anchor";

export async function GET() {
  const anchor = await getAnchorExport();
  const fileDate = formatAnchorDate(new Date(anchor.generatedAt));

  return new Response(JSON.stringify(anchor, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="forensicvault-anchor-${fileDate}.json"`,
    },
  });
}
