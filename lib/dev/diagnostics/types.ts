export type DiagnosticStatus = "GO" | "NO_GO" | "WARNING" | "SKIPPED";

export type DiagnosticCategory =
  | "SYSTEM"
  | "DATABASE"
  | "AUTH"
  | "ROLES"
  | "PERMISSIONS"
  | "CASES"
  | "EVIDENCE"
  | "CUSTODY"
  | "SIGNATURES"
  | "VERIFICATION"
  | "LEDGER"
  | "ANCHORS"
  | "SHIELD"
  | "AUDIT"
  | "BACKUP"
  | "REPORTS"
  | "CASE_PACKET"
  | "WALLET"
  | "TAMPER_TEST"
  | "ROUTES"
  | "STORAGE";

export type DiagnosticCheck = {
  id: string;
  category: DiagnosticCategory;
  name: string;
  status: DiagnosticStatus;
  summary: string;
  details?: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
  remediation?: string;
  severity?: string;
};

export type DiagnosticRun = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  overallStatus: DiagnosticStatus;
  goCount: number;
  warningCount: number;
  noGoCount: number;
  skippedCount: number;
  checks: DiagnosticCheck[];
  mode: "readOnly" | "fullSmoke";
};
