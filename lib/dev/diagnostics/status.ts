import type { DiagnosticCheck, DiagnosticRun, DiagnosticStatus } from "@/lib/dev/diagnostics/types";

export function computeOverallDiagnosticStatus(
  checks: DiagnosticCheck[],
): DiagnosticStatus {
  if (checks.some((check) => check.status === "NO_GO")) {
    return "NO_GO";
  }
  if (checks.some((check) => check.status === "WARNING")) {
    return "WARNING";
  }
  if (checks.length > 0 && checks.every((check) => check.status === "SKIPPED")) {
    return "SKIPPED";
  }
  return "GO";
}

export function summarizeDiagnosticRun(
  runId: string,
  startedAt: Date,
  finishedAt: Date,
  checks: DiagnosticCheck[],
  mode: DiagnosticRun["mode"],
): DiagnosticRun {
  const goCount = checks.filter((check) => check.status === "GO").length;
  const warningCount = checks.filter((check) => check.status === "WARNING").length;
  const noGoCount = checks.filter((check) => check.status === "NO_GO").length;
  const skippedCount = checks.filter((check) => check.status === "SKIPPED").length;

  return {
    runId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    overallStatus: computeOverallDiagnosticStatus(checks),
    goCount,
    warningCount,
    noGoCount,
    skippedCount,
    checks,
    mode,
  };
}
