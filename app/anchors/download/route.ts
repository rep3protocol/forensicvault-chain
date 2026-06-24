import type { NextRequest } from "next/server";
import {
  formatAnchorDate,
  getAnchorExport,
} from "@/lib/anchors/anchor";
import { denyUnlessDownloadPermission } from "@/lib/auth/downloadAccess";

export async function GET(request: NextRequest) {
  const denied = await denyUnlessDownloadPermission("VIEW_ANCHORS", request);
  if (denied) return denied;

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
