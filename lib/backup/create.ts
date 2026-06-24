import { readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import type { User } from "@prisma/client";
import { buildBackupManifest } from "@/lib/backup/manifest";
import { sha256Buffer, sha256File } from "@/lib/backup/hash";
import {
  BACKUP_README,
  ensureBackupDirectory,
  getBackupDirectory,
  getBackupFilePath,
  getDatabasePath,
  isSafeBackupFilename,
  makeBackupFilename,
  makeBackupWorkingDirectory,
} from "@/lib/backup/paths";
import type { BackupPackageInfo } from "@/lib/backup/types";
import { copyFileWithHashCheck } from "@/lib/backup/hash";
import { mkdir } from "node:fs/promises";

export async function deleteTemporaryBackupWorkdirs() {
  const tmpRoot = path.join(getBackupDirectory(), ".tmp");
  try {
    const entries = await readdir(tmpRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await rm(path.join(tmpRoot, entry.name), { recursive: true, force: true });
      }
    }
  } catch {
    // ignore missing tmp dir
  }
}

export async function listBackupPackages(): Promise<BackupPackageInfo[]> {
  await ensureBackupDirectory();
  const backupDir = getBackupDirectory();
  let entries: string[] = [];

  try {
    entries = await readdir(backupDir);
  } catch {
    return [];
  }

  const packages: BackupPackageInfo[] = [];

  for (const filename of entries) {
    if (!isSafeBackupFilename(filename)) continue;
    const filePath = path.join(backupDir, filename);
    const info = await stat(filePath);
    if (!info.isFile()) continue;

    let sha256: string | null = null;
    const sidecarPath = `${filePath}.sha256.txt`;
    try {
      const sidecar = await readFile(sidecarPath, "utf8");
      sha256 = sidecar.trim().split(/\s+/)[0] ?? null;
    } catch {
      try {
        sha256 = await sha256File(filePath);
      } catch {
        sha256 = null;
      }
    }

    let manifestGeneratedAt: string | null = null;
    try {
      const zipData = await readFile(filePath);
      const zip = await JSZip.loadAsync(zipData);
      const manifestEntry = zip.file("manifest.json");
      if (manifestEntry) {
        const manifest = JSON.parse(await manifestEntry.async("string")) as {
          generatedAt?: string;
        };
        manifestGeneratedAt = manifest.generatedAt ?? null;
      }
    } catch {
      manifestGeneratedAt = null;
    }

    packages.push({
      filename,
      sizeBytes: info.size,
      createdAt: info.mtime,
      sha256,
      manifestGeneratedAt,
    });
  }

  return packages.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export async function getBackupPackageByName(filename: string) {
  const filePath = getBackupFilePath(filename);
  const info = await stat(filePath);
  return {
    filename,
    filePath,
    sizeBytes: info.size,
    createdAt: info.mtime,
    sha256: await sha256File(filePath),
  };
}

export async function createBackupPackage(input: {
  user: Pick<User, "id" | "name" | "email" | "role">;
  note?: string | null;
}) {
  await ensureBackupDirectory();
  await deleteTemporaryBackupWorkdirs();

  const workDir = makeBackupWorkingDirectory("create");
  const dbDir = path.join(workDir, "database");
  const evidenceDir = path.join(workDir, "evidence");
  await mkdir(dbDir, { recursive: true });
  await mkdir(evidenceDir, { recursive: true });

  const dbSource = getDatabasePath();
  const dbDest = path.join(dbDir, "vault.sqlite");
  await copyFileWithHashCheck(dbSource, dbDest);

  const manifest = await buildBackupManifest(input.user, { note: input.note });

  for (const file of manifest.files.evidenceFiles) {
    if (!file.exists) continue;
    const source = path.join(process.cwd(), "storage", file.relativePath);
    const dest = path.join(workDir, file.relativePath);
    await mkdir(path.dirname(dest), { recursive: true });
    try {
      await copyFileWithHashCheck(source, dest);
    } catch {
      // missing file already noted in manifest
    }
  }

  await writeFile(path.join(workDir, "README_BACKUP.txt"), BACKUP_README, "utf8");
  await writeFile(
    path.join(workDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  const zip = new JSZip();
  const addDirectory = async (dir: string, zipPath = "") => {
    const { readdir: readDir } = await import("node:fs/promises");
    const entries = await readDir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const entryZipPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await addDirectory(fullPath, entryZipPath);
      } else {
        const content = await readFile(fullPath);
        zip.file(entryZipPath.replace(/\\/g, "/"), content);
      }
    }
  };

  await addDirectory(workDir);

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  const filename = makeBackupFilename();
  const zipPath = getBackupFilePath(filename);
  await writeFile(zipPath, zipBuffer);
  const zipSha256 = sha256Buffer(zipBuffer);
  await writeFile(`${zipPath}.sha256.txt`, `${zipSha256}  ${filename}\n`, "utf8");

  await rm(workDir, { recursive: true, force: true });

  return {
    filename,
    filePath: zipPath,
    sha256: zipSha256,
    manifest,
    sizeBytes: zipBuffer.length,
  };
}
