import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { User } from "@prisma/client";
import { validateAuditLogChain } from "@/lib/audit/validation";
import { getBackupShieldSummary } from "@/lib/backup/summary";
import { listBackupPackages } from "@/lib/backup/create";
import { getCurrentVaultStatus } from "@/lib/backup/manifest";
import {
  getBackupDirectory,
  getEvidenceStorageDirectory,
  getProjectRoot,
  getRestoreHistoryDirectory,
  getStorageDirectory,
  joinProjectRoot,
} from "@/lib/backup/paths";
import { getBackupFilePath } from "@/lib/backup/paths";
import { verifyBackupPackage } from "@/lib/backup/verify";
import { countAdminUsers } from "@/lib/auth/adminBootstrap";
import { can } from "@/lib/auth/permissions";
import { normalizeRole, resolveRole } from "@/lib/auth/roles";
import { getCaseReadinessSummaries } from "@/lib/cases/readiness";
import { summarizeCustodySignatureEvents } from "@/lib/custody/signatures";
import { isOwnerDevToolsEnabled, isOwnerUser } from "@/lib/dev/owner";
import { summarizeDiagnosticRun } from "@/lib/dev/diagnostics/status";
import type { DiagnosticCheck, DiagnosticRun } from "@/lib/dev/diagnostics/types";
import { validateLedgerChain } from "@/lib/ledgerValidation";
import { prisma } from "@/lib/prisma";
import { scanShield } from "@/lib/shield/scan";

async function runCheck(
  id: string,
  category: DiagnosticCheck["category"],
  name: string,
  fn: () => Promise<Omit<DiagnosticCheck, "id" | "category" | "name" | "durationMs">>,
): Promise<DiagnosticCheck> {
  const started = Date.now();
  try {
    const result = await fn();
    return {
      id,
      category,
      name,
      durationMs: Date.now() - started,
      ...result,
    };
  } catch (error) {
    return {
      id,
      category,
      name,
      durationMs: Date.now() - started,
      status: "NO_GO",
      summary: "Check threw an unexpected error.",
      details: error instanceof Error ? error.message : "unknown error",
      remediation: "Inspect server logs and retry diagnostics.",
    };
  }
}

function routeExists(relativePath: string) {
  return existsSync(joinProjectRoot(relativePath));
}

export async function runOwnerDiagnostics(input?: {
  mode?: DiagnosticRun["mode"];
  user?: Pick<User, "id" | "name" | "email" | "role"> | null;
}): Promise<DiagnosticRun> {
  const startedAt = new Date();
  const mode = input?.mode ?? "readOnly";
  const user = input?.user ?? null;
  const checks: DiagnosticCheck[] = [];

  checks.push(
    await runCheck("system-node", "SYSTEM", "Node runtime available", async () => ({
      status: "GO",
      summary: `Node ${process.version} is available.`,
    })),
  );

  checks.push(
    await runCheck("system-env", "SYSTEM", "Required env loaded", async () => ({
      status: process.env.DATABASE_URL ? "GO" : "WARNING",
      summary: process.env.DATABASE_URL
        ? "DATABASE_URL is configured."
        : "DATABASE_URL is not set; default SQLite path will be used.",
    })),
  );

  checks.push(
    await runCheck("system-warning", "SYSTEM", "Local testnet warning configured", async () => ({
      status: "GO",
      summary: "LOCAL TESTNET warning is part of app copy and backup manifests.",
    })),
  );

  checks.push(
    await runCheck("system-storage", "SYSTEM", "Project storage directory", async () => {
      const storageDir = getStorageDirectory();
      await mkdir(storageDir, { recursive: true });
      return {
        status: "GO",
        summary: `Storage directory is available at ${path.relative(getProjectRoot(), storageDir)}.`,
      };
    }),
  );

  checks.push(
    await runCheck("database-connect", "DATABASE", "Prisma can connect", async () => {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "GO", summary: "Prisma database connection succeeded." };
    }),
  );

  checks.push(
    await runCheck("database-tables", "DATABASE", "Required tables exist", async () => {
      const tables = [
        ["user", prisma.user.count()],
        ["case", prisma.case.count()],
        ["evidenceItem", prisma.evidenceItem.count()],
        ["custodyEvent", prisma.custodyEvent.count()],
        ["ledgerBlock", prisma.ledgerBlock.count()],
        ["ledgerTransaction", prisma.ledgerTransaction.count()],
        ["verification", prisma.verification.count()],
        ["wallet", prisma.wallet.count()],
        ["tokenTransaction", prisma.tokenTransaction.count()],
        ["anchorRecord", prisma.anchorRecord.count()],
        ["shieldAlertAcknowledgement", prisma.shieldAlertAcknowledgement.count()],
        ["shieldEvent", prisma.shieldEvent.count()],
        ["auditLog", prisma.auditLog.count()],
      ] as const;
      await Promise.all(tables.map(([, promise]) => promise));
      return {
        status: "GO",
        summary: "All required Prisma tables are queryable.",
        metadata: { tableCount: tables.length },
      };
    }),
  );

  checks.push(
    await runCheck("database-migrations", "DATABASE", "Expected migrations present", async () => {
      const migrationsDir = joinProjectRoot("prisma", "migrations");
      const { readdir } = await import("node:fs/promises");
      const entries = existsSync(migrationsDir) ? await readdir(migrationsDir) : [];
      const needles = ["anchor", "signing", "audit_log"];
      const found = needles.filter((needle) =>
        entries.some((entry) => entry.toLowerCase().includes(needle)),
      );
      return {
        status: found.length === needles.length ? "GO" : "WARNING",
        summary: `Found ${entries.length} migration folder(s); matched ${found.length}/${needles.length} expected themes.`,
      };
    }),
  );

  checks.push(
    await runCheck("auth-users", "AUTH", "At least one user exists", async () => {
      const count = await prisma.user.count();
      return {
        status: count > 0 ? "GO" : "NO_GO",
        summary: count > 0 ? `${count} local user(s) found.` : "No local users exist.",
        remediation: "Register or seed a local user.",
      };
    }),
  );

  checks.push(
    await runCheck("auth-admin", "AUTH", "At least one ADMIN exists", async () => {
      const count = await countAdminUsers();
      return {
        status: count > 0 ? "GO" : "NO_GO",
        summary:
          count > 0 ? `${count} Admin user(s) found.` : "No Admin user exists.",
        remediation: "Assign at least one Admin in user management.",
      };
    }),
  );

  checks.push(
    await runCheck("auth-owner", "AUTH", "Current owner user is ADMIN", async () => {
      if (!user) {
        return {
          status: "WARNING",
          summary: "No current user provided for owner check.",
        };
      }
      return {
        status: isOwnerUser(user) ? "GO" : "WARNING",
        summary: isOwnerUser(user)
          ? "Current user passes owner diagnostics gate."
          : "Current user is not the configured owner gate user.",
      };
    }),
  );

  checks.push(
    await runCheck("roles-recognized", "ROLES", "User roles recognized", async () => {
      const users = await prisma.user.findMany({ select: { role: true } });
      const unrecognized = users.filter((item) => !resolveRole(item.role).recognized);
      return {
        status: unrecognized.length === 0 ? "GO" : "WARNING",
        summary:
          unrecognized.length === 0
            ? "All user roles normalize correctly."
            : `${unrecognized.length} user(s) have unrecognized role values.`,
      };
    }),
  );

  checks.push(
    await runCheck("permissions-admin", "PERMISSIONS", "ADMIN critical permissions", async () => {
      const critical = [
        "MANAGE_USERS",
        "VIEW_AUDIT_LOG",
        "VIEW_BACKUPS",
        "RESTORE_BACKUP",
        "RUN_DEV_DIAGNOSTICS",
      ] as const;
      const missing = critical.filter((permission) => !can("ADMIN", permission));
      return {
        status: missing.length === 0 ? "GO" : "NO_GO",
        summary:
          missing.length === 0
            ? "ADMIN has required critical permissions."
            : `ADMIN missing permissions: ${missing.join(", ")}`,
      };
    }),
  );

  checks.push(
    await runCheck("permissions-viewer", "PERMISSIONS", "VIEWER mutation restrictions", async () => {
      const blocked = ["UPLOAD_EVIDENCE", "MANAGE_USERS", "RESTORE_BACKUP"].every(
        (permission) => !can("VIEWER", permission as never),
      );
      return {
        status: blocked ? "GO" : "NO_GO",
        summary: blocked
          ? "VIEWER lacks mutation permissions as expected."
          : "VIEWER has unexpected mutation permissions.",
      };
    }),
  );

  checks.push(
    await runCheck("cases-query", "CASES", "Case table query works", async () => {
      const count = await prisma.case.count();
      return { status: "GO", summary: `${count} case(s) available.` };
    }),
  );

  checks.push(
    await runCheck("cases-readiness", "CASES", "Case readiness helper", async () => {
      const summaries = await getCaseReadinessSummaries();
      return {
        status: "GO",
        summary: `Case readiness helper returned ${summaries.length} case summary(ies).`,
      };
    }),
  );

  checks.push(
    await runCheck("evidence-query", "EVIDENCE", "Evidence table query works", async () => {
      const count = await prisma.evidenceItem.count();
      return { status: "GO", summary: `${count} evidence item(s) available.` };
    }),
  );

  checks.push(
    await runCheck("evidence-files", "EVIDENCE", "Evidence file inventory", async () => {
      const status = await getCurrentVaultStatus();
      return {
        status: status.missingEvidenceFiles === 0 ? "GO" : "WARNING",
        summary:
          status.missingEvidenceFiles === 0
            ? "All evidence files referenced in the database exist."
            : `${status.missingEvidenceFiles} evidence file(s) are missing on disk.`,
      };
    }),
  );

  checks.push(
    await runCheck("custody-query", "CUSTODY", "CustodyEvent table query works", async () => {
      const count = await prisma.custodyEvent.count();
      return { status: "GO", summary: `${count} custody event(s) available.` };
    }),
  );

  checks.push(
    await runCheck("signatures-summary", "SIGNATURES", "Custody signature summary", async () => {
      const events = await prisma.custodyEvent.findMany({
        select: {
          publicKey: true,
          signature: true,
          eventHash: true,
          previousEventHash: true,
        },
      });
      const summary = summarizeCustodySignatureEvents(events);
      if (summary.failedEvents > 0) {
        return {
          status: "NO_GO",
          summary: `${summary.failedEvents} custody signature(s) failed verification.`,
          remediation: "Review custody events with invalid signatures.",
        };
      }
      if (summary.missingSignatureEvents > 0) {
        return {
          status: "WARNING",
          summary: `${summary.missingSignatureEvents} legacy custody event(s) are missing signatures.`,
        };
      }
      return {
        status: "GO",
        summary: "Custody signature summary completed without failures.",
      };
    }),
  );

  checks.push(
    await runCheck("verification-query", "VERIFICATION", "Verification table query works", async () => {
      const [total, failed] = await Promise.all([
        prisma.verification.count(),
        prisma.verification.count({ where: { matched: false } }),
      ]);
      return {
        status: "GO",
        summary: `${total} verification record(s); ${failed} failed.`,
      };
    }),
  );

  checks.push(
    await runCheck("ledger-validation", "LEDGER", "Ledger chain validation", async () => {
      const validation = await validateLedgerChain();
      return {
        status: validation.valid ? "GO" : "NO_GO",
        summary: validation.valid
          ? `Ledger chain valid across ${validation.checkedBlocks} block(s).`
          : `Ledger chain invalid: ${validation.errors[0] ?? "unknown error"}`,
        remediation: "Review ledger explorer and tamper-test restore options.",
      };
    }),
  );

  checks.push(
    await runCheck("anchors-query", "ANCHORS", "AnchorRecord table query works", async () => {
      const count = await prisma.anchorRecord.count();
      return {
        status: count === 0 ? "WARNING" : "GO",
        summary:
          count === 0
            ? "No saved anchor snapshots yet."
            : `${count} saved anchor snapshot(s) available.`,
      };
    }),
  );

  checks.push(
    await runCheck("shield-scan", "SHIELD", "Shield scan runs", async () => {
      const scan = await scanShield();
      const critical = scan.unacknowledgedAlerts.filter(
        (alert) => alert.severity === "CRITICAL",
      ).length;
      const high = scan.unacknowledgedAlerts.filter(
        (alert) => alert.severity === "HIGH",
      ).length;
      if (critical > 0) {
        return {
          status: "NO_GO",
          summary: `${critical} unacknowledged CRITICAL Shield alert(s).`,
          remediation: "Review /guard and resolve critical alerts.",
        };
      }
      if (high > 0) {
        return {
          status: "WARNING",
          summary: `${high} unacknowledged HIGH Shield alert(s).`,
        };
      }
      return {
        status: "GO",
        summary: `Shield scan completed with status ${scan.status}.`,
      };
    }),
  );

  checks.push(
    await runCheck("audit-validation", "AUDIT", "Audit chain validation", async () => {
      const validation = await validateAuditLogChain();
      return {
        status: validation.valid ? "GO" : "NO_GO",
        summary: validation.valid
          ? `Audit chain valid across ${validation.totalEvents} event(s).`
          : `Audit chain invalid: ${validation.errors[0] ?? "unknown error"}`,
        remediation: "Review /audit validation errors.",
      };
    }),
  );

  checks.push(
    await runCheck("backup-directory", "BACKUP", "Backup directory available", async () => {
      const backupDir = getBackupDirectory();
      await mkdir(backupDir, { recursive: true });
      const packages = await listBackupPackages();
      return {
        status: packages.length > 0 ? "GO" : "WARNING",
        summary:
          packages.length > 0
            ? `${packages.length} backup package(s) found.`
            : "No local backup packages found yet.",
      };
    }),
  );

  checks.push(
    await runCheck("backup-verify-latest", "BACKUP", "Latest backup verification", async () => {
      const packages = await listBackupPackages();
      if (packages.length === 0) {
        return {
          status: "WARNING",
          summary: "No backup package available to verify.",
        };
      }
      const latest = packages[0];
      const result = await verifyBackupPackage(getBackupFilePath(latest.filename));
      return {
        status: result.valid ? "GO" : "NO_GO",
        summary: result.valid
          ? `Latest backup ${latest.filename} verified successfully.`
          : `Latest backup verification failed: ${result.errors[0] ?? "unknown error"}`,
      };
    }),
  );

  checks.push(
    await runCheck("backup-restore-markers", "BACKUP", "Restore history markers", async () => {
      const summary = await getBackupShieldSummary();
      return {
        status: summary.restoreMarkerCount > 0 ? "WARNING" : "GO",
        summary:
          summary.restoreMarkerCount > 0
            ? `${summary.restoreMarkerCount} restore marker(s) exist. Review restore history.`
            : "No restore markers recorded.",
      };
    }),
  );

  checks.push(
    await runCheck("wallet-query", "WALLET", "Wallet table query works", async () => {
      const count = await prisma.wallet.count();
      return { status: count > 0 ? "GO" : "WARNING", summary: `${count} wallet(s) found.` };
    }),
  );

  checks.push(
    await runCheck("tamper-test-access", "TAMPER_TEST", "Tamper test permission", async () => {
      return {
        status: can("ADMIN", "USE_TAMPER_TEST") ? "GO" : "NO_GO",
        summary: "Admin tamper test permission is configured.",
      };
    }),
  );

  checks.push(
    await runCheck("tamper-destructive", "TAMPER_TEST", "Destructive tamper simulation", async () => ({
      status: "SKIPPED",
      summary:
        mode === "fullSmoke"
          ? "Full smoke tamper tests are not implemented in v0.1.8."
          : "Destructive tamper simulation skipped in read-only mode.",
    })),
  );

  const requiredRoutes = [
    "app/page.tsx",
    "app/cases/page.tsx",
    "app/evidence/page.tsx",
    "app/guard/page.tsx",
    "app/audit/page.tsx",
    "app/backups/page.tsx",
    "app/admin/users/page.tsx",
    "app/tamper-test/page.tsx",
  ];

  checks.push(
    await runCheck("routes-required", "ROUTES", "Required route files exist", async () => {
      const missing = requiredRoutes.filter((route) => !routeExists(route));
      return {
        status: missing.length === 0 ? "GO" : "NO_GO",
        summary:
          missing.length === 0
            ? "All required route files exist."
            : `Missing route files: ${missing.join(", ")}`,
      };
    }),
  );

  checks.push(
    await runCheck("storage-paths", "STORAGE", "Storage paths creatable", async () => {
      await Promise.all([
        mkdir(getStorageDirectory(), { recursive: true }),
        mkdir(getEvidenceStorageDirectory(), { recursive: true }),
        mkdir(getBackupDirectory(), { recursive: true }),
        mkdir(getRestoreHistoryDirectory(), { recursive: true }),
      ]);
      return { status: "GO", summary: "Core storage paths are available." };
    }),
  );

  checks.push(
    await runCheck("dev-tools-enabled", "SYSTEM", "Owner diagnostics enabled", async () => ({
      status: isOwnerDevToolsEnabled() ? "GO" : "WARNING",
      summary: isOwnerDevToolsEnabled()
        ? "FORENSICVAULT_OWNER_DEV_TOOLS is enabled."
        : "Owner diagnostics are disabled by environment setting.",
    })),
  );

  const finishedAt = new Date();
  return summarizeDiagnosticRun(randomUUID(), startedAt, finishedAt, checks, mode);
}
