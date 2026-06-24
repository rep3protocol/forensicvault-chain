import type { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { denyUnlessDownloadPermission } from "@/lib/auth/downloadAccess";
import { getCurrentUserWithRole } from "@/lib/auth/requirePermission";
import { getBackupFilePath } from "@/lib/backup/paths";

export async function GET(request: NextRequest) {
  const denied = await denyUnlessDownloadPermission("DOWNLOAD_BACKUP", request);
  if (denied) return denied;

  const rawFilename = request.nextUrl.searchParams.get("file")?.trim();
  if (!rawFilename) {
    return new Response("Missing file parameter.", { status: 400 });
  }

  const filePath = getBackupFilePath(rawFilename);
  const filename = path.basename(filePath);
  const buffer = await readFile(filePath);
  const session = await getCurrentUserWithRole();

  await recordAuditEventSafe({
    ...(session ? getAuditActorFromUser(session.user) : {}),
    action: AUDIT_ACTIONS.BACKUP_DOWNLOADED,
    category: "BACKUP",
    severity: "NOTICE",
    outcome: "SUCCESS",
    targetType: "BackupPackage",
    targetLabel: filename,
    route: "/backups/download",
    method: "GET",
    summary: `Backup downloaded: ${filename}`,
    metadata: { filename },
  });

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
