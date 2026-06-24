import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { listBackupPackages } from "@/lib/backup/create";
import { listRestoreMarkers } from "@/lib/backup/restore";
import { getBackupDirectory } from "@/lib/backup/paths";

export type BackupShieldSummary = {
  backupPackageCount: number;
  latestBackupFilename: string | null;
  latestBackupCreatedAt: string | null;
  latestBackupSha256: string | null;
  latestBackupVerified: boolean | null;
  restoreMarkerCount: number;
  latestRestoreAt: string | null;
  latestRestoreBackupFilename: string | null;
  preRestoreBackupExists: boolean;
};

const verificationCache = new Map<string, boolean>();

export async function getLatestBackupVerification(
  filename: string,
): Promise<boolean | null> {
  if (verificationCache.has(filename)) {
    return verificationCache.get(filename) ?? null;
  }

  try {
    const { verifyBackupPackage } = await import("@/lib/backup/verify");
    const filePath = path.join(getBackupDirectory(), filename);
    const result = await verifyBackupPackage(filePath);
    verificationCache.set(filename, result.valid);
    return result.valid;
  } catch {
    return null;
  }
}

export async function getBackupShieldSummary(): Promise<BackupShieldSummary> {
  const [packages, restoreMarkers] = await Promise.all([
    listBackupPackages(),
    listRestoreMarkers(),
  ]);

  const latest = packages[0] ?? null;
  let latestBackupVerified: boolean | null = null;

  if (latest) {
    latestBackupVerified = await getLatestBackupVerification(latest.filename);
  }

  const latestRestore = restoreMarkers[0] ?? null;
  let preRestoreBackupExists = false;

  if (latestRestore?.preRestoreBackupFilename) {
    try {
      await stat(
        path.join(getBackupDirectory(), latestRestore.preRestoreBackupFilename),
      );
      preRestoreBackupExists = true;
    } catch {
      preRestoreBackupExists = false;
    }
  }

  return {
    backupPackageCount: packages.length,
    latestBackupFilename: latest?.filename ?? null,
    latestBackupCreatedAt: latest?.manifestGeneratedAt ?? latest?.createdAt.toISOString() ?? null,
    latestBackupSha256: latest?.sha256 ?? null,
    latestBackupVerified,
    restoreMarkerCount: restoreMarkers.length,
    latestRestoreAt: latestRestore?.restoredAt ?? null,
    latestRestoreBackupFilename: latestRestore?.backupFilename ?? null,
    preRestoreBackupExists,
  };
}
