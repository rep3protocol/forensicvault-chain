import Link from "next/link";
import { TestnetWarning } from "@/components/TestnetWarning";
import { shortenHash } from "@/lib/format";
import { getAuditLogs, getAuditFilterOptions } from "@/lib/audit/query";
import { getAuditLogSummary, validateAuditLogChain } from "@/lib/audit/validation";
import {
  getAuditActorFromUser,
  recordAuditEventSafe,
} from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/types";
import { can } from "@/lib/auth/permissions";
import { getCurrentUserWithRole, requirePermission } from "@/lib/auth/requirePermission";

function badgeClass(kind: string) {
  switch (kind) {
    case "CRITICAL":
    case "ERROR":
    case "FAILURE":
      return "bg-red-900/50 text-red-300";
    case "HIGH":
    case "DENIED":
      return "bg-orange-900/50 text-orange-300";
    case "WARNING":
      return "bg-amber-900/50 text-amber-300";
    case "NOTICE":
    case "SUCCESS":
      return "bg-emerald-900/50 text-emerald-300";
    default:
      return "bg-slate-800 text-slate-300";
  }
}

type AuditPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    action?: string;
    severity?: string;
    outcome?: string;
    targetType?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

export default async function AuditLogPage({ searchParams }: AuditPageProps) {
  const user = await requirePermission("VIEW_AUDIT_LOG");
  const session = await getCurrentUserWithRole();
  const query = await searchParams;

  const filters = {
    q: query.q?.trim() || undefined,
    category: query.category?.trim() || undefined,
    action: query.action?.trim() || undefined,
    severity: query.severity?.trim() || undefined,
    outcome: query.outcome?.trim() || undefined,
    targetType: query.targetType?.trim() || undefined,
    from: query.from?.trim() || undefined,
    to: query.to?.trim() || undefined,
    page: query.page ? Number(query.page) : 1,
  };

  const [logs, filterOptions, summary, validation] = await Promise.all([
    getAuditLogs(filters),
    getAuditFilterOptions(),
    getAuditLogSummary(),
    validateAuditLogChain(),
  ]);

  await recordAuditEventSafe({
    ...getAuditActorFromUser(user),
    action: AUDIT_ACTIONS.AUDIT_LOG_VIEWED,
    category: "SYSTEM",
    severity: "INFO",
    outcome: "SUCCESS",
    route: "/audit",
    summary: "Audit log page viewed",
    metadata: {
      filtersApplied: Boolean(
        filters.q ||
          filters.category ||
          filters.action ||
          filters.severity ||
          filters.outcome ||
          filters.targetType ||
          filters.from ||
          filters.to,
      ),
      resultCount: logs.total,
    },
  });

  const canExport = session ? can(session.role, "EXPORT_AUDIT_LOG") : false;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-slate-100">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">ForensicVault Audit Log</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            Local hash-linked app activity log for security review, role changes,
            evidence actions, exports, anchors, Shield activity, and tamper-test usage.
          </p>
        </div>
        <TestnetWarning />
      </div>

      <section className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm leading-relaxed text-amber-100/90">
        This is local MVP audit logging. It is tamper-evident through hash linkage,
        not tamper-proof, and it is not a production SIEM.
      </section>

      {!validation.valid && (
        <section className="mb-8 rounded-lg border border-red-500/50 bg-red-950/30 px-5 py-4">
          <h2 className="text-sm font-semibold text-red-200">Audit chain invalid</h2>
          <p className="mt-2 text-sm leading-relaxed text-red-100/90">
            The local audit log hash chain does not validate. This may indicate database
            edits, restore from backup, corruption, or development testing.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-100/80">
            {validation.errors.slice(0, 5).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase text-slate-500">Audit Chain Status</p>
          <p className={`mt-2 text-xl font-semibold ${validation.valid ? "text-emerald-300" : "text-red-300"}`}>
            {validation.valid ? "Valid" : "Invalid"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase text-slate-500">Total Events</p>
          <p className="mt-2 text-2xl font-semibold">{summary.validation.totalEvents}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase text-slate-500">Latest Sequence</p>
          <p className="mt-2 text-2xl font-semibold">{validation.latestSequence ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase text-slate-500">Latest Audit Hash</p>
          <p className="mt-2 font-mono text-xs text-slate-300">
            {shortenHash(validation.latestAuditHash, 12, 8)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase text-slate-500">Critical / High</p>
          <p className="mt-2 text-2xl font-semibold">
            {summary.criticalCount + summary.highCount}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase text-slate-500">Denied Events</p>
          <p className="mt-2 text-2xl font-semibold">{summary.deniedCount}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase text-slate-500">Failed / Error</p>
          <p className="mt-2 text-2xl font-semibold">{summary.failedOrErrorCount}</p>
        </div>
        {canExport && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase text-slate-500">Export</p>
            <a
              href="/audit/download"
              className="mt-3 inline-block rounded bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Download JSON
            </a>
          </div>
        )}
      </section>

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
        <form className="grid gap-4 lg:grid-cols-4">
          <label className="lg:col-span-2">
            <span className="text-xs uppercase text-slate-500">Search</span>
            <input
              name="q"
              defaultValue={filters.q}
              placeholder="Summary, actor, target, hash..."
              className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="text-xs uppercase text-slate-500">Category</span>
            <select name="category" defaultValue={filters.category} className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">All</option>
              {filterOptions.categories.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs uppercase text-slate-500">Action</span>
            <select name="action" defaultValue={filters.action} className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">All</option>
              {filterOptions.actions.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs uppercase text-slate-500">Severity</span>
            <select name="severity" defaultValue={filters.severity} className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">All</option>
              {filterOptions.severities.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs uppercase text-slate-500">Outcome</span>
            <select name="outcome" defaultValue={filters.outcome} className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">All</option>
              {filterOptions.outcomes.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs uppercase text-slate-500">Target Type</span>
            <select name="targetType" defaultValue={filters.targetType} className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="">All</option>
              {filterOptions.targetTypes.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs uppercase text-slate-500">From</span>
            <input type="date" name="from" defaultValue={filters.from} className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </label>
          <label>
            <span className="text-xs uppercase text-slate-500">To</span>
            <input type="date" name="to" defaultValue={filters.to} className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          </label>
          <div className="flex items-end gap-3 lg:col-span-2">
            <button type="submit" className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600">
              Apply Filters
            </button>
            <Link href="/audit" className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[80rem] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/80">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-400">Seq</th>
              <th className="px-4 py-3 font-medium text-slate-400">Timestamp</th>
              <th className="px-4 py-3 font-medium text-slate-400">Severity</th>
              <th className="px-4 py-3 font-medium text-slate-400">Outcome</th>
              <th className="px-4 py-3 font-medium text-slate-400">Category</th>
              <th className="px-4 py-3 font-medium text-slate-400">Action</th>
              <th className="px-4 py-3 font-medium text-slate-400">Actor</th>
              <th className="px-4 py-3 font-medium text-slate-400">Target</th>
              <th className="px-4 py-3 font-medium text-slate-400">Summary</th>
              <th className="px-4 py-3 font-medium text-slate-400">Hash</th>
              <th className="px-4 py-3 font-medium text-slate-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/30">
            {logs.events.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-3 tabular-nums">{event.sequence}</td>
                <td className="px-4 py-3 text-slate-400">{event.timestamp.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${badgeClass(event.severity)}`}>
                    {event.severity}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${badgeClass(event.outcome)}`}>
                    {event.outcome}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{event.category}</td>
                <td className="px-4 py-3 font-mono text-xs text-cyan-300">{event.action}</td>
                <td className="px-4 py-3 text-slate-300">{event.actorName ?? "—"}</td>
                <td className="px-4 py-3 text-slate-400">{event.targetLabel ?? event.targetId ?? "—"}</td>
                <td className="px-4 py-3 text-slate-300">{event.summary}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{shortenHash(event.auditHash, 10, 6)}</td>
                <td className="px-4 py-3">
                  <Link href={`/audit/${event.id}`} className="text-cyan-300 hover:text-cyan-200">
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-4 text-sm text-slate-500">
        Page {logs.page} of {logs.totalPages} · {logs.total} event(s)
      </p>
    </main>
  );
}
