import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileSearch,
  Fingerprint,
  ShieldCheck,
} from "lucide-react";
import { TestnetWarning } from "@/components/TestnetWarning";
import { requireCurrentUser } from "@/lib/auth/session";
import { shortenHash } from "@/lib/format";
import { scanShield } from "@/lib/shield/scan";
import { severityClassName } from "@/lib/shield/severity";
import { countAlertsBySeverity } from "@/lib/shield/summary";
import type {
  ShieldAlert,
  ShieldAlertCategory,
  ShieldEventSummary,
  ShieldStatus,
} from "@/lib/shield/types";
import {
  acknowledgeShieldAlert,
  clearShieldAcknowledgement,
} from "@/app/guard/actions";

function statusClassName(status: ShieldStatus) {
  switch (status) {
    case "CRITICAL":
      return "border-red-500/60 bg-red-950/40 text-red-200";
    case "RISK":
      return "border-orange-500/60 bg-orange-950/30 text-orange-200";
    case "WATCH":
      return "border-amber-500/60 bg-amber-950/30 text-amber-200";
    case "CLEAR":
      return "border-emerald-500/50 bg-emerald-950/20 text-emerald-200";
  }
}

function displayStatus(status: ShieldStatus) {
  if (status === "RISK") return "Risk";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-100">
        {value}
      </p>
      {detail && <p className="mt-2 text-xs text-slate-400">{detail}</p>}
    </div>
  );
}

function AlertCard({ alert }: { alert: ShieldAlert }) {
  const acknowledgement = alert.acknowledgement;
  const canAcknowledge = alert.severity !== "INFO";

  return (
    <article className={`rounded-lg border p-5 ${severityClassName(alert.severity)}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded border border-current/30 px-2 py-0.5 text-xs font-semibold">
              {alert.severity}
            </span>
            {acknowledgement && (
              <span className="inline-flex rounded border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                Acknowledged
              </span>
            )}
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-100">
            {alert.title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            {alert.description}
          </p>
        </div>
        {alert.reference && (
          <p className="max-w-sm text-left font-mono text-xs break-words text-slate-400 sm:text-right">
            {alert.reference}
          </p>
        )}
      </div>
      <dl className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-sm md:grid-cols-2">
        <div>
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Deterministic Reason
          </dt>
          <dd className="mt-1 text-slate-300">{alert.reason}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Recommended Action
          </dt>
          <dd className="mt-1 text-slate-300">{alert.action}</dd>
        </div>
      </dl>
      {canAcknowledge && acknowledgement ? (
        <div className="mt-4 rounded border border-emerald-500/30 bg-emerald-950/20 p-4">
          <p className="text-xs font-medium tracking-wide text-emerald-200 uppercase">
            Reviewed By
          </p>
          <p className="mt-1 text-sm text-slate-200">
            {acknowledgement.acknowledgedByName} ·{" "}
            {acknowledgement.acknowledgedAt.toLocaleString()}
          </p>
          {acknowledgement.note && (
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {acknowledgement.note}
            </p>
          )}
          <form action={clearShieldAcknowledgement} className="mt-4">
            <input type="hidden" name="alertId" value={alert.id} />
            <button
              type="submit"
              className="rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
            >
              Clear Acknowledgement
            </button>
          </form>
        </div>
      ) : canAcknowledge ? (
        <form
          action={acknowledgeShieldAlert}
          className="mt-4 rounded border border-slate-700 bg-slate-950/40 p-4"
        >
          <input type="hidden" name="alertId" value={alert.id} />
          <input type="hidden" name="alertTitle" value={alert.title} />
          <input type="hidden" name="severity" value={alert.severity} />
          <input type="hidden" name="category" value={alert.category} />
          <input type="hidden" name="reference" value={alert.reference ?? ""} />
          <input type="hidden" name="reason" value={alert.reason} />
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Optional Review Note
            </span>
            <textarea
              name="note"
              rows={3}
              className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
              placeholder="Document why this deterministic alert was reviewed."
            />
          </label>
          <button
            type="submit"
            className="mt-3 rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
          >
            Acknowledge Alert
          </button>
        </form>
      ) : null}
    </article>
  );
}

function AlertSection({
  title,
  alerts,
  empty,
}: {
  title: string;
  alerts: ShieldAlert[];
  empty: string;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
        {title}
      </h2>
      {alerts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-6 py-8 text-sm text-slate-400">
          {empty}
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </section>
  );
}

function alertsForCategory(alerts: ShieldAlert[], category: ShieldAlertCategory) {
  return alerts.filter((alert) => alert.category === category);
}

function EventLog({ events }: { events: ShieldEventSummary[] }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
        Shield Event Log
      </h2>
      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-6 py-8 text-sm text-slate-400">
          No Shield acknowledgement events recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-400">Event</th>
                <th className="px-4 py-3 font-medium text-slate-400">Title</th>
                <th className="px-4 py-3 font-medium text-slate-400">Actor</th>
                <th className="px-4 py-3 font-medium text-slate-400">Created</th>
                <th className="px-4 py-3 font-medium text-slate-400">Alert ID</th>
                <th className="px-4 py-3 font-medium text-slate-400">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/30">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 font-mono text-xs text-cyan-300">
                    {event.eventType}
                  </td>
                  <td className="px-4 py-3 text-slate-200">{event.title}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {event.actorName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {event.createdAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {event.alertId ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {event.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function GuardPage() {
  await requireCurrentUser();
  const scan = await scanShield();
  const activeCounts = countAlertsBySeverity(scan.unacknowledgedAlerts);
  const criticalHighAlerts = scan.unacknowledgedAlerts.filter(
    (alert) => alert.severity === "CRITICAL" || alert.severity === "HIGH",
  );
  const evidenceAlerts = alertsForCategory(scan.alerts, "evidence");
  const custodyAlerts = alertsForCategory(scan.alerts, "custody");
  const ledgerAlerts = alertsForCategory(scan.alerts, "ledger");
  const duplicateAlerts = alertsForCategory(scan.alerts, "duplicates");

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium tracking-wide text-cyan-200 uppercase">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            AI-ready rule-based security monitor
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
            ForensicVault Shield
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            Rule-based integrity monitor for evidence custody, ledger health,
            verification failures, duplicate patterns, and anchor readiness.
          </p>
          <div className="mt-4">
            <TestnetWarning />
          </div>
        </div>
        <div className={`rounded-lg border px-5 py-4 ${statusClassName(scan.status)}`}>
          <p className="text-xs font-medium tracking-wide uppercase">
            Overall Shield Status
          </p>
          <p className="mt-1 text-2xl font-semibold">{displayStatus(scan.status)}</p>
          <p className="mt-2 text-xs text-slate-400">
            Last scan: {scan.generatedAt.toLocaleString()}
          </p>
          {scan.rawStatus !== scan.status && (
            <p className="mt-1 text-xs text-slate-400">
              Raw status before acknowledgements: {displayStatus(scan.rawStatus)}
            </p>
          )}
        </div>
      </div>

      <section className="mb-8 rounded-lg border border-amber-500/50 bg-amber-950/30 px-5 py-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-amber-100/90">
            This is an AI-ready monitoring layer. It does not replace SHA-256
            verification, ledger validation, custody hash linkage, signature
            checks, or external anchor comparison.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Shield Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Overall Shield Status"
            value={displayStatus(scan.status)}
            detail="Based on unacknowledged alerts"
          />
          <SummaryCard
            label="Unacknowledged Critical"
            value={activeCounts.CRITICAL}
            detail="Active critical alerts"
          />
          <SummaryCard
            label="Unacknowledged High"
            value={activeCounts.HIGH}
            detail="Active high alerts"
          />
          <SummaryCard
            label="Acknowledged Alerts"
            value={scan.metrics.acknowledgedAlertCount}
            detail="Reviewed, still active"
          />
          <SummaryCard
            label="Unacknowledged Alerts"
            value={scan.unacknowledgedAlerts.length}
            detail="All active severities"
          />
          <SummaryCard
            label="Evidence Without Verification"
            value={scan.metrics.evidenceWithoutVerification}
          />
          <SummaryCard
            label="Failed Verifications"
            value={scan.metrics.failedVerifications}
          />
          <SummaryCard
            label="Duplicate Hash Groups"
            value={scan.metrics.duplicateHashGroups}
            detail={`${scan.metrics.crossCaseDuplicateHashGroups} cross-case`}
          />
          <SummaryCard
            label="Ledger Status"
            value={scan.metrics.ledgerValid ? "Valid" : "Invalid"}
            detail={`${scan.metrics.totalLedgerBlocks} blocks checked`}
          />
          <SummaryCard
            label="Latest Block"
            value={scan.metrics.latestBlockHeight ?? "—"}
            detail={shortenHash(scan.metrics.latestBlockHash, 12, 8)}
          />
        </div>
      </section>

      <section className="mb-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Cases" value={scan.metrics.totalCases} />
        <SummaryCard label="Total Evidence Items" value={scan.metrics.totalEvidenceItems} />
        <SummaryCard label="Total Custody Events" value={scan.metrics.totalCustodyEvents} />
        <SummaryCard label="Total Verifications" value={scan.metrics.totalVerifications} />
      </section>

      <AlertSection
        title="Critical / High Alerts"
        alerts={criticalHighAlerts}
        empty="No unacknowledged critical or high alerts detected by the rule-based monitor."
      />

      <AlertSection
        title="Acknowledged Alerts"
        alerts={scan.acknowledgedAlerts}
        empty="No active Shield alerts have been acknowledged yet."
      />

      <AlertSection
        title="Evidence Integrity"
        alerts={evidenceAlerts}
        empty="No evidence integrity alerts detected."
      />

      <AlertSection
        title="Custody Integrity"
        alerts={custodyAlerts}
        empty="No custody integrity alerts detected."
      />

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Ledger Integrity
        </h2>
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <Database className="mb-3 h-5 w-5 text-cyan-300" aria-hidden="true" />
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Latest Block Hash
            </p>
            <p className="mt-2 font-mono text-xs break-all text-slate-200">
              {scan.metrics.latestBlockHash ?? "—"}
            </p>
          </div>
          <SummaryCard label="Latest Block Height" value={scan.metrics.latestBlockHeight ?? "—"} />
          <SummaryCard label="Total Ledger Blocks" value={scan.metrics.totalLedgerBlocks} />
        </div>
        <div className="space-y-4">
          {ledgerAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
          {scan.ledgerErrors.length > 0 && (
            <div className="rounded-lg border border-red-800/70 bg-red-950/30 p-5">
              <h3 className="text-sm font-semibold text-red-200">
                Ledger validation details
              </h3>
              <ul className="mt-3 space-y-2">
                {scan.ledgerErrors.map((error) => (
                  <li key={error} className="font-mono text-xs break-words text-red-100/90">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Duplicate Evidence Patterns
        </h2>
        <div className="mb-4 space-y-4">
          {duplicateAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
        {scan.duplicateGroups.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-400">SHA-256</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Items</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Cases</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                {scan.duplicateGroups.map((group) => (
                  <tr key={group.sha256Hash}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {shortenHash(group.sha256Hash, 14, 10)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-300">
                      {group.itemCount}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {group.caseTitles.join(", ")}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {group.evidenceNames.join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Recommended Next Actions
        </h2>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <ul className="space-y-3">
            {scan.recommendedActions.map((action) => (
              <li key={action} className="flex gap-3 text-sm text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/ledger"
              className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <Fingerprint className="h-4 w-4" aria-hidden="true" />
              Open Ledger
            </Link>
            <Link
              href="/verify"
              className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <FileSearch className="h-4 w-4" aria-hidden="true" />
              Verify Evidence
            </Link>
            <Link
              href="/anchors"
              className="inline-flex items-center gap-2 rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
            >
              Export Anchor
            </Link>
          </div>
        </div>
      </section>

      <EventLog events={scan.recentEvents} />
    </div>
  );
}
