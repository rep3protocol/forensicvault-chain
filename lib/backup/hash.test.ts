import { describe, expect, it } from "vitest";
import { sha256Buffer, safeRelativePath } from "@/lib/backup/hash";
import path from "node:path";

describe("backup hash helpers", () => {
  it("produces deterministic sha256Buffer output", () => {
    const buffer = Buffer.from("forensicvault-backup-test");
    expect(sha256Buffer(buffer)).toBe(sha256Buffer(buffer));
  });

  it("blocks path traversal in safeRelativePath", () => {
    const base = path.join(process.cwd(), "storage", "backups");
    expect(() => safeRelativePath(base, "../dev.db")).toThrow(/traversal/i);
  });

  it("allows safe relative paths", () => {
    const base = path.join(process.cwd(), "storage", "backups");
    const relative = safeRelativePath(base, "evidence/file.txt");
    expect(relative).toBe(`evidence${path.sep}file.txt`);
  });
});
