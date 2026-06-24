import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { User } from "@prisma/client";
import { recordAuditEvent, getAuditActorFromUser } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { createBackupPackage } from "@/lib/backup/create";
import { sha256File } from "@/lib/backup/hash";
import {
  ensureBackupDirectory,
  getDatabasePath,
  getEvidenceStorageDirectory,
  getBackupFilePath,
  getRestoreHistoryDirectory,
  makeBackupWorkingDirectory,
} from "@/lib/backup/paths";
import { previewRestoreFromBackupFile } from "@/lib/backup/restorePreview";
import type { RestoreMarker } from "@/lib/backup/types";
import { extractBackupSafely, verifyBackupPackage } from "@/lib/backup/verify";

export const RESTORE_CONFIRMATION_TEXT = "RESTORE LOCAL VAULT";

export async function createPreRestoreSafetyBackup(
  user: Pick<User, "id" | "name" | "email" | "role">,
) {
  return createBackupPackage({
    user,
    note: "Automatic pre-restore safety backup",
  });
}

export async function writeRestoreMarker(marker: RestoreMarker) {
  await ensureBackupDirectory();
  const restoreDir = getRestoreHistoryDirectory();
  await mkdir(restoreDir, { recursive: true });
  const stamp = marker.restoredAt.replace(/[:.]/g, "-");
  const filePath = path.join(restoreDir, `restore-${stamp}.json`);
  await writeFile(filePath, JSON.stringify(marker, null, 2), "utf8");
  return filePath;
}

export async function listRestoreMarkers(): Promise<RestoreMarker[]> {
  const restoreDir = getRestoreHistoryDirectory();
  try {
    const files = await readdir(restoreDir);
    const markers: RestoreMarker[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const content = await readFile(path.join(restoreDir, file), "utf8");
      markers.push(JSON.parse(content) as RestoreMarker);
    }
    return markers.sort((a, b) => b.restoredAt.localeCompare(a.restoredAt));
  } catch {
    return [];
  }
}

async function replaceDatabaseAndStorageFromBackup(extractedDir: string) {
  const dbSource = path.join(extractedDir, "database", "vault.sqlite");
  const dbTarget = getDatabasePath();

  for (const suffix of ["-wal", "-shm", "-journal"]) {
    try {
      await rm(`${dbTarget}${suffix}`, { force: true });
    } catch {
      // ignore
    }
  }

  await copyFile(dbSource, dbTarget);

  const evidenceRoot = getEvidenceStorageDirectory();
  await mkdir(evidenceRoot, { recursive: true });

  const extractedEvidenceDir = path.join(extractedDir, "evidence");
  try {
    const files = await readdir(extractedEvidenceDir, { withFileTypes: true });
    for (const entry of files) {
      if (!entry.isFile()) continue;
      const source = path.join(extractedEvidenceDir, entry.name);
      const dest = path.join(evidenceRoot, entry.name);
      await copyFile(source, dest);
    }
  } catch {
    // no evidence directory in backup
  }

  const manifestPath = path.join(extractedDir, "manifest.json");
  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      files: { evidenceFiles: { relativePath: string }[] };
    };
    for (const file of manifest.files.evidenceFiles) {
      const relative = file.relativePath.replace(/^evidence\//, "");
      const source = path.join(extractedDir, file.relativePath);
      const dest = path.join(evidenceRoot, relative);
      await mkdir(path.dirname(dest), { recursive: true });
      try {
        await copyFile(source, dest);
      } catch {
        // skip missing nested paths
      }
    }
  } catch {
    // manifest already used above when possible
  }
}

export async function restoreFromBackupPackage(input: {
  filename: string;
  user: Pick<User, "id" | "name" | "email" | "role">;
  confirmText: string;
}) {
  if (input.confirmText !== RESTORE_CONFIRMATION_TEXT) {
    await recordAuditEvent({
      ...getAuditActorFromUser(input.user),
      action: AUDIT_ACTIONS.RESTORE_BLOCKED,
      category: "BACKUP",
      severity: "HIGH",
      outcome: "DENIED",
      targetType: "BackupPackage",
      targetLabel: input.filename,
      summary: "Restore blocked: invalid confirmation text",
    });
    throw new Error(
      `Restore requires exact confirmation text: ${RESTORE_CONFIRMATION_TEXT}`,
    );
  }

  const filePath = getBackupFilePath(input.filename);
  const verification = await verifyBackupPackage(filePath);
  const preview = await previewRestoreFromBackupFile(input.filename);

  if (!verification.valid || !preview.restoreAllowed) {
    await recordAuditEvent({
      ...getAuditActorFromUser(input.user),
      action: AUDIT_ACTIONS.RESTORE_BLOCKED,
      category: "BACKUP",
      severity: "HIGH",
      outcome: "DENIED",
      targetType: "BackupPackage",
      targetLabel: input.filename,
      summary: "Restore blocked: backup verification failed",
      metadata: { errors: verification.errors.slice(0, 5) },
    });
    throw new Error(
      verification.errors[0] ?? "Backup verification failed. Restore blocked.",
    );
  }

  const preRestoreBackup = await createPreRestoreSafetyBackup(input.user);
  const backupSha256 = await sha256File(filePath);
  const buffer = await readFile(filePath);
  const workDir = makeBackupWorkingDirectory("restore");
  await mkdir(workDir, { recursive: true });

  await recordAuditEvent({
    ...getAuditActorFromUser(input.user),
    action: AUDIT_ACTIONS.PRE_RESTORE_SAFETY_BACKUP_CREATED,
    category: "BACKUP",
    severity: "NOTICE",
    outcome: "SUCCESS",
    targetType: "BackupPackage",
    targetLabel: preRestoreBackup.filename,
    summary: `Pre-restore safety backup created: ${preRestoreBackup.filename}`,
    metadata: {
      filename: preRestoreBackup.filename,
      zipSha256: preRestoreBackup.sha256,
    },
  });

  await recordAuditEvent({
    ...getAuditActorFromUser(input.user),
    action: AUDIT_ACTIONS.RESTORE_EXECUTED,
    category: "BACKUP",
    severity: "HIGH",
    outcome: "SUCCESS",
    targetType: "BackupPackage",
    targetLabel: input.filename,
    summary: `Local vault restore executed from ${input.filename}`,
    metadata: {
      filename: input.filename,
      backupSha256,
      preRestoreBackupFilename: preRestoreBackup.filename,
    },
  });

  await extractBackupSafely(buffer, workDir);
  await replaceDatabaseAndStorageFromBackup(workDir);

  const marker: RestoreMarker = {
    restoredAt: new Date().toISOString(),
    restoredBy: {
      userId: input.user.id,
      name: input.user.name,
      email: input.user.email,
    },
    backupFilename: input.filename,
    backupSha256,
    preRestoreBackupFilename: preRestoreBackup.filename,
    warning:
      "Local vault files were replaced from backup. Restart the dev server and sign in again.",
  };

  await writeRestoreMarker(marker);
  await rm(workDir, { recursive: true, force: true });

  return {
    marker,
    preRestoreBackupFilename: preRestoreBackup.filename,
    requiresRestart: true,
  };
}
