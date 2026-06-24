"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { assertPermission } from "@/lib/auth/requirePermission";
import { createBackupPackage } from "@/lib/backup/create";
import { getBackupFilePath } from "@/lib/backup/paths";
import { previewRestoreFromBackupFile } from "@/lib/backup/restorePreview";
import { restoreFromBackupPackage } from "@/lib/backup/restore";
import { verifyBackupPackage } from "@/lib/backup/verify";

export async function createBackupAction(formData: FormData) {
  const user = await assertPermission(
    "CREATE_BACKUP",
    "Your current local role does not allow creating backups.",
  );
  const note = String(formData.get("note") || "").trim() || null;
  const result = await createBackupPackage({ user, note });

  await recordAuditEventSafe({
    ...getAuditActorFromUser(user),
    action: AUDIT_ACTIONS.BACKUP_CREATED,
    category: "BACKUP",
    severity: "NOTICE",
    outcome: "SUCCESS",
    targetType: "BackupPackage",
    targetLabel: result.filename,
    route: "/backups",
    summary: `Backup created: ${result.filename}`,
    metadata: {
      filename: result.filename,
      zipSha256: result.sha256,
      counts: result.manifest.counts,
      ledgerLatestHash: result.manifest.integrity.ledgerLatestHash,
      auditLatestHash: result.manifest.integrity.auditLatestHash,
    },
  });

  revalidatePath("/backups");
  revalidatePath("/guard");
  redirect(`/backups?created=${encodeURIComponent(result.filename)}`);
}

export async function verifyBackupAction(formData: FormData) {
  const user = await assertPermission(
    "VERIFY_BACKUP",
    "Your current local role does not allow verifying backups.",
  );
  const filename = String(formData.get("filename") || "").trim();
  if (!filename) throw new Error("Backup filename is required.");

  const result = await verifyBackupPackage(getBackupFilePath(filename));

  await recordAuditEventSafe({
    ...getAuditActorFromUser(user),
    action: result.valid
      ? AUDIT_ACTIONS.BACKUP_VERIFIED
      : AUDIT_ACTIONS.BACKUP_VERIFICATION_FAILED,
    category: "BACKUP",
    severity: result.valid ? "NOTICE" : "HIGH",
    outcome: result.valid ? "SUCCESS" : "FAILURE",
    targetType: "BackupPackage",
    targetLabel: filename,
    route: "/backups",
    summary: result.valid
      ? `Backup verified: ${filename}`
      : `Backup verification failed: ${filename}`,
    metadata: {
      filename,
      valid: result.valid,
      errorCount: result.errors.length,
    },
  });

  revalidatePath("/backups");
  revalidatePath("/guard");
  redirect(
    `/backups?verified=${encodeURIComponent(filename)}&valid=${result.valid ? "1" : "0"}`,
  );
}

export async function previewRestoreAction(formData: FormData) {
  const user = await assertPermission(
    "VIEW_RESTORE_PREVIEW",
    "Your current local role does not allow restore preview.",
  );
  const filename = String(formData.get("filename") || "").trim();
  if (!filename) throw new Error("Backup filename is required.");

  const preview = await previewRestoreFromBackupFile(filename);

  await recordAuditEventSafe({
    ...getAuditActorFromUser(user),
    action: AUDIT_ACTIONS.RESTORE_PREVIEWED,
    category: "BACKUP",
    severity: "INFO",
    outcome: preview.restoreAllowed ? "SUCCESS" : "FAILURE",
    targetType: "BackupPackage",
    targetLabel: filename,
    route: "/backups",
    summary: `Restore preview for ${filename}`,
    metadata: {
      filename,
      restoreAllowed: preview.restoreAllowed,
      validBackup: preview.validBackup,
    },
  });

  revalidatePath("/backups");
  redirect(
    `/backups?preview=${encodeURIComponent(filename)}&allowed=${preview.restoreAllowed ? "1" : "0"}`,
  );
}

export async function restoreBackupAction(formData: FormData) {
  const user = await assertPermission(
    "RESTORE_BACKUP",
    "Your current local role does not allow restoring backups.",
  );
  const filename = String(formData.get("filename") || "").trim();
  const confirmText = String(formData.get("confirmText") || "").trim();
  if (!filename) throw new Error("Backup filename is required.");

  await restoreFromBackupPackage({
    filename,
    user,
    confirmText,
  });

  revalidatePath("/backups");
  revalidatePath("/guard");
  redirect("/logout?restored=1");
}
