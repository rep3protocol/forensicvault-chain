import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const STATIC_DB_RELATIVE_PATHS = [
  "prisma/dev.db",
  "prisma/db.sqlite",
  "dev.db",
  "storage/forensicvault.db",
] as const;

function projectRoot() {
  return process.cwd();
}

export function joinProjectRoot(...segments: string[]) {
  return path.join(/* turbopackIgnore: true */ projectRoot(), ...segments);
}

export function getProjectRoot() {
  return projectRoot();
}

export function getStorageDirectory() {
  return joinProjectRoot("storage");
}

export function getEvidenceStorageDirectory() {
  return joinProjectRoot("storage", "evidence");
}

export function getBackupDirectory() {
  return joinProjectRoot("storage", "backups");
}

export function getBackupTempDirectory() {
  return joinProjectRoot("storage", "backups", ".tmp");
}

export function getRestoreHistoryDirectory() {
  return joinProjectRoot("storage", "restore-history");
}

export function ensureInsideProjectRoot(candidatePath: string) {
  const root = projectRoot();
  const resolved = path.resolve(candidatePath);
  const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;

  if (resolved !== root && !resolved.startsWith(rootPrefix)) {
    throw new Error("Path escapes project root.");
  }

  return resolved;
}

export function ensureInsideStorage(candidatePath: string) {
  const storage = getStorageDirectory();
  const resolved = path.resolve(candidatePath);
  const storagePrefix = storage.endsWith(path.sep) ? storage : `${storage}${path.sep}`;

  if (resolved !== storage && !resolved.startsWith(storagePrefix)) {
    throw new Error("Path escapes storage directory.");
  }

  return resolved;
}

/** @deprecated Use ensureInsideProjectRoot */
export const resolveInsideRoot = ensureInsideProjectRoot;

/** @deprecated Use ensureInsideStorage */
export const resolveInsideStorage = ensureInsideStorage;

function resolveDatabasePathFromEnv(databaseUrl?: string) {
  const url = databaseUrl ?? process.env.DATABASE_URL ?? "file:./dev.db";

  if (!url.startsWith("file:")) {
    throw new Error(
      "Only file: SQLite DATABASE_URL is supported for local backup.",
    );
  }

  const rawPath = url.slice("file:".length).trim();
  if (!rawPath) {
    throw new Error("DATABASE_URL file path is empty.");
  }

  const resolved =
    rawPath.startsWith("./") || rawPath.startsWith("../")
      ? joinProjectRoot(rawPath)
      : path.isAbsolute(rawPath)
        ? path.resolve(rawPath)
        : joinProjectRoot(rawPath);

  return ensureInsideProjectRoot(resolved);
}

export function parseDatabaseUrl(databaseUrl?: string) {
  return resolveDatabasePathFromEnv(databaseUrl);
}

export function getDatabasePath() {
  const fromEnv = resolveDatabasePathFromEnv();
  if (existsSync(fromEnv)) {
    return fromEnv;
  }

  for (const relativePath of STATIC_DB_RELATIVE_PATHS) {
    const candidate = joinProjectRoot(...relativePath.split("/"));
    ensureInsideProjectRoot(candidate);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return fromEnv;
}

export function getDatabasePathLabel() {
  const dbPath = getDatabasePath();
  const relative = path.relative(projectRoot(), dbPath);
  return relative.startsWith("..") ? "dev.db" : relative;
}

export async function ensureBackupDirectory() {
  await mkdir(getBackupDirectory(), { recursive: true });
  await mkdir(getBackupTempDirectory(), { recursive: true });
  await mkdir(getRestoreHistoryDirectory(), { recursive: true });
}

export function makeBackupFilename(date = new Date()) {
  const stamp = date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "")
    .replace("T", "-")
    .slice(0, 15);
  return `forensicvault-backup-${stamp}.zip`;
}

export function makeBackupWorkingDirectory(prefix: string) {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40);
  return path.join(
    getBackupTempDirectory(),
    `${safePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
}

export function assertSafeBackupFilename(filename: string) {
  const base = path.basename(filename);

  if (
    base !== filename ||
    !/^forensicvault-backup-\d{8}-\d{6}\.zip$/.test(base)
  ) {
    throw new Error("Invalid backup filename.");
  }

  return base;
}

export function isSafeBackupFilename(filename: string) {
  try {
    assertSafeBackupFilename(filename);
    return true;
  } catch {
    return false;
  }
}

export function getBackupFilePath(filename: string) {
  const safeName = assertSafeBackupFilename(filename);
  return ensureInsideStorage(path.join(getBackupDirectory(), safeName));
}

export const BACKUP_README = `ForensicVault Chain Local Backup
LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.

This backup may contain sensitive local database data, including local MVP
credential hashes and local signing key material. Store securely.

This is local MVP backup/restore, not production-grade disaster recovery.
Do not edit files inside this package unless you understand hash verification will fail.
`;
