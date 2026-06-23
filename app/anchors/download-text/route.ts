import {
  formatAnchorDate,
  getAnchorExport,
  getAnchorText,
} from "@/lib/anchors/anchor";

export async function GET() {
  const anchor = await getAnchorExport();
  const fileDate = formatAnchorDate(new Date(anchor.generatedAt));

  return new Response(getAnchorText(anchor), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="forensicvault-anchor-${fileDate}.txt"`,
    },
  });
}
