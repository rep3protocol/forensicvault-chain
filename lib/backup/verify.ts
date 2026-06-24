import { readFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import JSZip from "jszip";
import { sha256Buffer, sha256File } from "@/lib/backup/hash";
import { safeRelativePath } from "@/lib/backup/hash";
import {
  BACKUP_PACKAGE_VERSION,
  type BackupManifest,
  type BackupVerificationResult,
} from "@/lib/backup/types";

function normalizeZipEntry(name: string) {
  const normalized = path.posix.normalize(name.replace(/\\/g, "/"));
  if (
    normalized.startsWith("../") ||
    normalized.startsWith("/") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Unsafe zip entry blocked: ${name}`);
  }
  return normalized;
}

export async function readManifestFromZip(zip: JSZip) {
  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) {
    throw new Error("manifest.json is missing from backup package.");
  }
  return JSON.parse(await manifestEntry.async("string")) as BackupManifest;
}

export function verifyBackupManifestIntegrity(
  manifest: BackupManifest,
): string[] {
  const errors: string[] = [];

  if (manifest.packageVersion !== BACKUP_PACKAGE_VERSION) {
    errors.push(`Unsupported package version: ${manifest.packageVersion}`);
  }

  if (!manifest.generatedAt) {
    errors.push("Manifest missing generatedAt.");
  }

  if (!manifest.warning?.includes("LOCAL TESTNET")) {
    errors.push("Manifest warning text is missing or incomplete.");
  }

  if (!manifest.sensitiveDataWarning) {
    errors.push("Manifest sensitive data warning is missing.");
  }

  if (!manifest.files?.database?.sha256) {
    errors.push("Manifest database hash is missing.");
  }

  return errors;
}

async function verifyZipContents(
  zip: JSZip,
  manifest: BackupManifest,
): Promise<BackupVerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [...verifyBackupManifestIntegrity(manifest)];

  const readme = zip.file("README_BACKUP.txt");
  if (!readme) {
    errors.push("README_BACKUP.txt is missing.");
  } else {
    const readmeText = await readme.async("string");
    if (!readmeText.includes("LOCAL TESTNET")) {
      warnings.push("README_BACKUP.txt may be incomplete.");
    }
  }

  const dbEntry = zip.file(manifest.files.database.name);
  let databaseFilePresent = false;
  let databaseHashMatched = false;

  if (!dbEntry) {
    errors.push("Database file is missing from backup package.");
  } else {
    databaseFilePresent = true;
    const dbBuffer = await dbEntry.async("nodebuffer");
    const dbHash = sha256Buffer(dbBuffer);
    databaseHashMatched = dbHash === manifest.files.database.sha256;
    if (!databaseHashMatched) {
      errors.push("Database file hash does not match manifest.");
    } else {
      try {
        const db = new Database(dbBuffer);
        const tables = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
          )
          .all() as { name: string }[];
        const required = [
          "User",
          "Case",
          "EvidenceItem",
          "CustodyEvent",
          "LedgerBlock",
          "AuditLog",
        ];
        for (const table of required) {
          if (!tables.some((row) => row.name === table)) {
            errors.push(`Backup database missing table: ${table}`);
          }
        }
        db.close();
      } catch (error) {
        warnings.push(
          `Could not open backup database read-only: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      }
    }
  }

  let evidenceFilesChecked = 0;
  let evidenceFilesMissing = 0;
  let evidenceFilesHashMismatched = 0;

  for (const evidenceFile of manifest.files.evidenceFiles) {
    evidenceFilesChecked += 1;
    const entry = zip.file(evidenceFile.relativePath);
    if (!entry) {
      evidenceFilesMissing += 1;
      if (evidenceFile.exists) {
        errors.push(`Evidence file missing from package: ${evidenceFile.relativePath}`);
      } else {
        warnings.push(
          `Evidence file was missing at backup time: ${evidenceFile.originalName}`,
        );
      }
      continue;
    }

    const buffer = await entry.async("nodebuffer");
    const hash = sha256Buffer(buffer);
    if (hash !== evidenceFile.sha256) {
      evidenceFilesHashMismatched += 1;
      errors.push(
        `Evidence file hash mismatch: ${evidenceFile.originalName}`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifest,
    databaseFilePresent,
    databaseHashMatched,
    evidenceFilesChecked,
    evidenceFilesMissing,
    evidenceFilesHashMismatched,
    auditChainValidAtBackup: manifest.integrity.auditValid,
    ledgerValidAtBackup: manifest.integrity.ledgerValid,
  };
}

export async function verifyBackupBuffer(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const manifest = await readManifestFromZip(zip);
  return verifyZipContents(zip, manifest);
}

export async function verifyBackupPackage(filePath: string) {
  const buffer = await readFile(filePath);
  return verifyBackupBuffer(buffer);
}

export async function extractBackupSafely(
  buffer: Buffer,
  destinationDir: string,
) {
  const zip = await JSZip.loadAsync(buffer);
  const { mkdir, writeFile } = await import("node:fs/promises");

  for (const [entryName, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const safeName = normalizeZipEntry(entryName);
    safeRelativePath(destinationDir, safeName);
    const targetPath = path.join(destinationDir, safeName);
    await mkdir(path.dirname(targetPath), { recursive: true });
    const content = await entry.async("nodebuffer");
    await writeFile(targetPath, content);
  }

  return zip;
}

export async function readManifestFromBackup(filePath: string) {
  const buffer = await readFile(filePath);
  const zip = await JSZip.loadAsync(buffer);
  return readManifestFromZip(zip);
}
