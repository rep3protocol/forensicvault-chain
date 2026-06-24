import { readFile } from "node:fs/promises";
import {
  getVaultCounts,
  getBackupIntegritySummary,
} from "@/lib/backup/manifest";
import { verifyBackupPackage, verifyBackupBuffer } from "@/lib/backup/verify";
import { getBackupFilePath } from "@/lib/backup/paths";
import type {
  BackupManifest,
  BackupVerificationResult,
  RestorePreviewResult,
} from "@/lib/backup/types";

export async function compareCurrentVaultToBackup(manifest: BackupManifest) {
  const [counts, integrity] = await Promise.all([
    getVaultCounts(),
    getBackupIntegritySummary(),
  ]);

  return {
    currentVaultCounts: counts,
    incomingVaultCounts: manifest.counts,
    currentLedgerLatestHash: integrity.ledgerLatestHash,
    incomingLedgerLatestHash: manifest.integrity.ledgerLatestHash,
    currentAuditLatestHash: integrity.auditLatestHash,
    incomingAuditLatestHash: manifest.integrity.auditLatestHash,
  };
}

export async function previewRestoreFromManifest(
  manifest: BackupManifest,
  verification: Pick<BackupVerificationResult, "valid" | "errors" | "warnings">,
): Promise<RestorePreviewResult> {
  const comparison = await compareCurrentVaultToBackup(manifest);
  const warnings = [
    ...verification.warnings,
    "Restore will replace the current local SQLite database and evidence storage.",
    "Current unsaved data may be lost.",
    "Backup may include local private key material and credential hashes.",
    "After restore, current sessions may become invalid.",
    "This is local MVP backup/restore only, not production disaster recovery.",
    "Restarting the dev server may be required after restore.",
  ];
  const errors = [...verification.errors];

  if (manifest.packageVersion !== "FV_BACKUP_V1") {
    errors.push("Unsupported backup package version.");
  }

  const restoreAllowed = verification.valid && errors.length === 0;

  const destructiveImpactSummary = restoreAllowed
    ? `Incoming backup has ${manifest.counts.cases} case(s), ${manifest.counts.evidenceItems} evidence item(s), ${manifest.counts.ledgerBlocks} ledger block(s), and ${manifest.counts.auditLogs} audit event(s). Current vault will be replaced.`
    : "Restore blocked because backup verification failed or package version is unsupported.";

  return {
    validBackup: verification.valid,
    restoreAllowed,
    warnings,
    errors,
    ...comparison,
    destructiveImpactSummary,
    manifest,
  };
}

export async function previewRestoreFromBackupFile(
  filename: string,
): Promise<RestorePreviewResult> {
  const filePath = getBackupFilePath(filename);
  const verification = await verifyBackupPackage(filePath);
  if (!verification.manifest) {
    return {
      validBackup: false,
      restoreAllowed: false,
      warnings: verification.warnings,
      errors: verification.errors.length
        ? verification.errors
        : ["Backup manifest could not be read."],
      currentVaultCounts: null,
      incomingVaultCounts: null,
      currentLedgerLatestHash: null,
      incomingLedgerLatestHash: null,
      currentAuditLatestHash: null,
      incomingAuditLatestHash: null,
      destructiveImpactSummary:
        "Restore blocked because backup verification failed.",
      manifest: null,
    };
  }

  return previewRestoreFromManifest(verification.manifest, verification);
}

export async function previewRestoreFromUploadedBuffer(
  buffer: Buffer,
): Promise<RestorePreviewResult> {
  const verification = await verifyBackupBuffer(buffer);
  if (!verification.manifest) {
    return {
      validBackup: false,
      restoreAllowed: false,
      warnings: verification.warnings,
      errors: verification.errors,
      currentVaultCounts: null,
      incomingVaultCounts: null,
      currentLedgerLatestHash: null,
      incomingLedgerLatestHash: null,
      currentAuditLatestHash: null,
      incomingAuditLatestHash: null,
      destructiveImpactSummary:
        "Restore blocked because backup verification failed.",
      manifest: null,
    };
  }

  return previewRestoreFromManifest(verification.manifest, verification);
}
