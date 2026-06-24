import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { sha256Buffer as sha256BufferFromCrypto } from "@/lib/crypto/hash";
import { ensureInsideProjectRoot } from "@/lib/backup/paths";

export function sha256Buffer(buffer: Buffer) {
  return sha256BufferFromCrypto(buffer);
}

export async function sha256File(filePath: string) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(filePath), hash);
  return hash.digest("hex");
}

export async function getFileSize(filePath: string) {
  const info = await stat(filePath);
  return info.size;
}

export function safeRelativePath(baseDir: string, filePath: string) {
  const base = ensureInsideProjectRoot(baseDir);
  const resolved = ensureInsideProjectRoot(path.resolve(base, filePath));
  const relative = path.relative(base, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path traversal blocked.");
  }

  return relative;
}

export async function copyFileWithHashCheck(
  source: string,
  destination: string,
) {
  const { copyFile } = await import("node:fs/promises");
  await copyFile(source, destination);
  const [sourceHash, destHash] = await Promise.all([
    sha256File(source),
    sha256File(destination),
  ]);

  if (sourceHash !== destHash) {
    throw new Error("Copied file hash mismatch.");
  }

  return sourceHash;
}
