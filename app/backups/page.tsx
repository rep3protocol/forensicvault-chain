import Link from "next/link";
import { TestnetWarning } from "@/components/TestnetWarning";
import { shortenHash } from "@/lib/format";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { can } from "@/lib/auth/permissions";
import { getCurrentUserWithRole, requirePermission } from "@/lib/auth/requirePermission";
import { listBackupPackages } from "@/lib/backup/create";
import { getCurrentVaultStatus } from "@/lib/backup/manifest";
import { previewRestoreFromBackupFile } from "@/lib/backup/restorePreview";
import { listRestoreMarkers } from "@/lib/backup/restore";
import {
  createBackupAction,
  previewRestoreAction,
  restoreBackupAction,
  verifyBackupAction,
} from "./actions";
import { RESTORE_CONFIRMATION_TEXT } from "@/lib/backup/restore";

type BackupsPageProps = {
  searchParams: Promise<{
    created?: string;
    verified?: string;
    valid?: string;
    preview?: string;
    allowed?: string;
  }>;
};

export default async function BackupsPage({ searchParams }: BackupsPageProps) {
  const user = await requirePermission("VIEW_BACKUPS");
  const session = await getCurrentUserWithRole();
  const query = await searchParams;

  const [vaultStatus, packages, restoreMarkers] = await Promise.all([
    getCurrentVaultStatus(),
    listBackupPackages(),
    listRestoreMarkers(),
  ]);

  await recordAuditEventSafe({
    ...getAuditActorFromUser(user),
    action: AUDIT_ACTIONS.BACKUP_PAGE_VIEWED,
    category: "BACKUP",
    severity: "INFO",
    outcome: "SUCCESS",
    route: "/backups",
    summary: "Backup page viewed",
  });

  const canCreate = session ? can(session.role, "CREATE_BACKUP") : false;
  const canVerify = session ? can(session.role, "VERIFY_BACKUP") : false;
  const canDownload = session ? can(session.role, "DOWNLOAD_BACKUP") : false;
  const canPreview = session ? can(session.role, "VIEW_RESTORE_PREVIEW") : false;
  const canRestore = session ? can(session.role, "RESTORE_BACKUP") : false;

  const previewFilename = query.preview?.trim();
  const previewResult = previewFilename
    ? await previewRestoreFromBackupFile(previewFilename)
    : null;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-slate-100">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            ForensicVault Backup &amp; Restore
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            Create, verify, download, and restore local vault backups.
          </p>
        </div>
        <TestnetWarning />
      </div>

      <section className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm leading-relaxed text-amber-100/90">
        Local MVP backup/restore. Backup files may contain sensitive local database
        data, including local credential hashes and signing key material. Store backup
        files securely. This is not production-grade disaster recovery.
      </section>

      {query.created && (
        <section className="mb-6 rounded-lg border border-emerald-500/40 bg-emerald-950/20 px-5 py-4 text-sm text-emerald-100">
          Backup created: <span className="font-mono">{query.created}</span>
        </section>
      )}

      {query.verified && (
        <section
          className={`mb-6 rounded-lg border px-5 py-4 text-sm ${
            query.valid === "1"
              ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-100"
              : "border-red-500/40 bg-red-950/20 text-red-100"
          }`}
        >
          Verification for <span className="font-mono">{query.verified}</span>:{" "}
          {query.valid === "1" ? "passed" : "failed"}
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Current Vault Integrity
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase text-slate-500">Ledger Status</p>
            <p className={`mt-2 text-xl font-semibold ${vaultStatus.integrity.ledgerValid ? "text-emerald-300" : "text-red-300"}`}>
              {vaultStatus.integrity.ledgerValid ? "Valid" : "Invalid"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase text-slate-500">Audit Log Status</p>
            <p className={`mt-2 text-xl font-semibold ${vaultStatus.integrity.auditValid ? "text-emerald-300" : "text-red-300"}`}>
              {vaultStatus.integrity.auditValid ? "Valid" : "Invalid"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase text-slate-500">Evidence Files</p>
            <p className="mt-2 text-2xl font-semibold">{vaultStatus.evidenceFileCount}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase text-slate-500">Missing Evidence Files</p>
            <p className="mt-2 text-2xl font-semibold">{vaultStatus.missingEvidenceFiles}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase text-slate-500">Latest Ledger Hash</p>
            <p className="mt-2 font-mono text-xs text-slate-300">
              {shortenHash(vaultStatus.integrity.ledgerLatestHash, 12, 8)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase text-slate-500">Latest Audit Hash</p>
            <p className="mt-2 font-mono text-xs text-slate-300">
              {shortenHash(vaultStatus.integrity.auditLatestHash, 12, 8)}
            </p>
          </div>
        </div>
      </section>

      {canCreate && (
        <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
            Create Backup
          </h2>
          <form action={createBackupAction} className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[16rem]">
              <span className="text-xs uppercase text-slate-500">Optional Note</span>
              <input
                name="note"
                placeholder="Pre-demo snapshot"
                className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Create Backup
            </button>
          </form>
        </section>
      )}

      <section className="mb-8 overflow-x-auto rounded-lg border border-slate-800">
        <h2 className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Existing Backup Packages
        </h2>
        <table className="w-full min-w-[64rem] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-400">Filename</th>
              <th className="px-4 py-3 font-medium text-slate-400">Created</th>
              <th className="px-4 py-3 font-medium text-slate-400">Size</th>
              <th className="px-4 py-3 font-medium text-slate-400">SHA-256</th>
              <th className="px-4 py-3 font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/30">
            {packages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-slate-400">
                  No backup packages found yet.
                </td>
              </tr>
            ) : (
              packages.map((pkg) => (
                <tr key={pkg.filename}>
                  <td className="px-4 py-3 font-mono text-xs text-cyan-300">{pkg.filename}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {(pkg.manifestGeneratedAt
                      ? new Date(pkg.manifestGeneratedAt)
                      : pkg.createdAt
                    ).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{pkg.sizeBytes.toLocaleString()} B</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {shortenHash(pkg.sha256, 10, 6)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {canVerify && (
                        <form action={verifyBackupAction}>
                          <input type="hidden" name="filename" value={pkg.filename} />
                          <button type="submit" className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800">
                            Verify
                          </button>
                        </form>
                      )}
                      {canDownload && (
                        <a
                          href={`/backups/download?file=${encodeURIComponent(pkg.filename)}`}
                          className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
                        >
                          Download
                        </a>
                      )}
                      {canPreview && (
                        <form action={previewRestoreAction}>
                          <input type="hidden" name="filename" value={pkg.filename} />
                          <button type="submit" className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800">
                            Restore Preview
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {previewResult && (
        <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
            Restore Preview: {previewFilename}
          </h2>
          <p className="mb-4 text-sm text-slate-300">{previewResult.destructiveImpactSummary}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xs uppercase text-slate-500">Current Vault</h3>
              <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-300">
                {JSON.stringify(
                  {
                    counts: previewResult.currentVaultCounts,
                    ledgerHash: previewResult.currentLedgerLatestHash,
                    auditHash: previewResult.currentAuditLatestHash,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
            <div>
              <h3 className="text-xs uppercase text-slate-500">Incoming Backup</h3>
              <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-300">
                {JSON.stringify(
                  {
                    counts: previewResult.incomingVaultCounts,
                    ledgerHash: previewResult.incomingLedgerLatestHash,
                    auditHash: previewResult.incomingAuditLatestHash,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-amber-100/90">
            {previewResult.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            Restore allowed:{" "}
            <span className={previewResult.restoreAllowed ? "text-emerald-300" : "text-red-300"}>
              {previewResult.restoreAllowed ? "Yes" : "No"}
            </span>
          </p>
        </section>
      )}

      {canRestore && packages.length > 0 && (
        <section className="mb-8 rounded-lg border border-red-500/40 bg-red-950/20 p-5">
          <h2 className="mb-4 text-sm font-medium tracking-wide text-red-200 uppercase">
            Execute Restore (Admin Only)
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-red-100/90">
            This will replace the local SQLite database and local evidence storage with
            the selected backup package. A pre-restore safety backup will be created
            first. Restarting the dev server may be required.
          </p>
          <form action={restoreBackupAction} className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="text-xs uppercase text-slate-400">Backup Package</span>
              <select
                name="filename"
                required
                defaultValue={packages[0]?.filename}
                className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              >
                {packages.map((pkg) => (
                  <option key={pkg.filename} value={pkg.filename}>
                    {pkg.filename}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs uppercase text-slate-400">
                Confirmation ({RESTORE_CONFIRMATION_TEXT})
              </span>
              <input
                name="confirmText"
                required
                placeholder={RESTORE_CONFIRMATION_TEXT}
                className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Restore Local Vault
              </button>
            </div>
          </form>
        </section>
      )}

      {restoreMarkers.length > 0 && (
        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
            Restore History
          </h2>
          <ul className="space-y-3 text-sm text-slate-300">
            {restoreMarkers.slice(0, 5).map((marker) => (
              <li key={marker.restoredAt}>
                {new Date(marker.restoredAt).toLocaleString()} — restored from{" "}
                <span className="font-mono text-cyan-300">{marker.backupFilename}</span>
                {" "}(pre-restore: {marker.preRestoreBackupFilename})
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-sm text-slate-500">
        <Link href="/guard" className="text-cyan-300 hover:text-cyan-200">
          Open Shield
        </Link>{" "}
        to review backup integrity alerts.
      </p>
    </main>
  );
}
