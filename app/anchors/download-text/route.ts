import type { NextRequest } from "next/server";
import {
  formatAnchorDate,
  getAnchorExport,
  getAnchorText,
} from "@/lib/anchors/anchor";
import { denyUnlessDownloadPermission } from "@/lib/auth/downloadAccess";

export async function GET(request: NextRequest) {
  const denied = await denyUnlessDownloadPermission("VIEW_ANCHORS", request);
  if (denied) return denied;

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
