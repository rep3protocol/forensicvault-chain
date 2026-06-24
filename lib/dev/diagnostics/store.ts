import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { DiagnosticRun } from "@/lib/dev/diagnostics/types";
import { getStorageDirectory } from "@/lib/backup/paths";

function getDiagnosticsStorePath() {
  return path.join(getStorageDirectory(), "diagnostics-last-run.json");
}

export async function saveDiagnosticRun(run: DiagnosticRun) {
  const filePath = getDiagnosticsStorePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(run, null, 2), "utf8");
  return filePath;
}

export async function loadDiagnosticRun(): Promise<DiagnosticRun | null> {
  try {
    const content = await readFile(getDiagnosticsStorePath(), "utf8");
    return JSON.parse(content) as DiagnosticRun;
  } catch {
    return null;
  }
}
