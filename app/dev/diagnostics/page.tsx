import Link from "next/link";
import { TestnetWarning } from "@/components/TestnetWarning";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { isOwnerDevToolsEnabled } from "@/lib/dev/owner";
import { loadDiagnosticRun } from "@/lib/dev/diagnostics/store";
import { requireOwnerDevToolAccess } from "@/lib/dev/owner";
import { runDiagnosticsAction } from "./actions";

function statusClass(status: string) {
  switch (status) {
    case "GO":
      return "bg-emerald-900/50 text-emerald-300";
    case "WARNING":
      return "bg-amber-900/50 text-amber-300";
    case "NO_GO":
      return "bg-red-900/50 text-red-300";
    default:
      return "bg-slate-800 text-slate-300";
  }
}

type DiagnosticsPageProps = {
  searchParams: Promise<{ ran?: string }>;
};

export default async function DiagnosticsPage({ searchParams }: DiagnosticsPageProps) {
  const user = await requireOwnerDevToolAccess();
  await searchParams;
  const lastRun = await loadDiagnosticRun();

  await recordAuditEventSafe({
    ...getAuditActorFromUser(user),
    action: AUDIT_ACTIONS.DEV_DIAGNOSTIC_VIEWED,
    category: "SYSTEM",
    severity: "INFO",
    outcome: "SUCCESS",
    route: "/dev/diagnostics",
    summary: "Owner diagnostics page viewed",
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-slate-100">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Owner Dev Diagnostics</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            Runs local read-only checks across ForensicVault Chain and reports GO /
            NO-GO for major features.
          </p>
        </div>
        <TestnetWarning />
      </div>

      <section className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm leading-relaxed text-amber-100/90">
        Owner-only local developer tool. This does not prove production readiness,
        legal admissibility, or tamper-proof security.
        {!isOwnerDevToolsEnabled() && (
          <span className="mt-2 block text-red-200">
            FORENSICVAULT_OWNER_DEV_TOOLS is not enabled.
          </span>
        )}
      </section>

      {lastRun && (
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase text-slate-500">Overall Status</p>
            <p className={`mt-2 text-2xl font-semibold ${lastRun.overallStatus === "GO" ? "text-emerald-300" : lastRun.overallStatus === "WARNING" ? "text-amber-300" : "text-red-300"}`}>
              {lastRun.overallStatus}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase text-slate-500">Total Checks</p>
            <p className="mt-2 text-2xl font-semibold">{lastRun.checks.length}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase text-slate-500">GO / Warning / NO-GO</p>
            <p className="mt-2 text-xl font-semibold">
              {lastRun.goCount} / {lastRun.warningCount} / {lastRun.noGoCount}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase text-slate-500">Last Run</p>
            <p className="mt-2 text-sm text-slate-300">
              {new Date(lastRun.finishedAt).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">{lastRun.durationMs} ms</p>
          </div>
        </section>
      )}

      {lastRun?.overallStatus === "NO_GO" && (
        <section className="mb-6 rounded-lg border border-red-500/40 bg-red-950/20 px-5 py-4 text-sm text-red-100">
          Do not tag/release until NO-GO items are resolved.
        </section>
      )}

      {lastRun?.overallStatus === "WARNING" && (
        <section className="mb-6 rounded-lg border border-amber-500/40 bg-amber-950/20 px-5 py-4 text-sm text-amber-100">
          Warnings may be acceptable for local MVP if documented.
        </section>
      )}

      <section className="mb-8 flex flex-wrap gap-3">
        <form action={runDiagnosticsAction}>
          <button
            type="submit"
            className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
          >
            Run Read-Only Diagnostics
          </button>
        </form>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded border border-slate-700 px-4 py-2 text-sm text-slate-500"
        >
          Full Smoke Test (Coming soon)
        </button>
        {lastRun && (
          <a
            href="/dev/diagnostics/download"
            className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Export Diagnostic JSON
          </a>
        )}
      </section>

      {lastRun ? (
        <section className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[72rem] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-400">Category</th>
                <th className="px-4 py-3 font-medium text-slate-400">Check</th>
                <th className="px-4 py-3 font-medium text-slate-400">Status</th>
                <th className="px-4 py-3 font-medium text-slate-400">Summary</th>
                <th className="px-4 py-3 font-medium text-slate-400">Details</th>
                <th className="px-4 py-3 font-medium text-slate-400">Remediation</th>
                <th className="px-4 py-3 font-medium text-slate-400">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/30">
              {lastRun.checks.map((check) => (
                <tr key={check.id}>
                  <td className="px-4 py-3 text-slate-300">{check.category}</td>
                  <td className="px-4 py-3 text-slate-300">{check.name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${statusClass(check.status)}`}>
                      {check.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{check.summary}</td>
                  <td className="px-4 py-3 text-slate-400">{check.details ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{check.remediation ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">{check.durationMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-6 py-10 text-center text-sm text-slate-400">
          No diagnostic run recorded yet. Run read-only diagnostics to populate results.
        </section>
      )}

      <p className="mt-6 text-sm text-slate-500">
        <Link href="/backups" className="text-cyan-300 hover:text-cyan-200">
          Open Backups
        </Link>
      </p>
    </main>
  );
}
