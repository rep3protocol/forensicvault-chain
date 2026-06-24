import Link from "next/link";
import { notFound } from "next/navigation";
import { TestnetWarning } from "@/components/TestnetWarning";
import { getAuditLogById } from "@/lib/audit/query";
import { validateAuditLogEntry } from "@/lib/audit/validation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/requirePermission";
import { shortenHash } from "@/lib/format";

type AuditDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AuditDetailPage({ params }: AuditDetailPageProps) {
  await requirePermission("VIEW_AUDIT_LOG");
  const { id } = await params;
  const event = await getAuditLogById(id);

  if (!event) {
    notFound();
  }

  const previous =
    event.sequence > 1
      ? await prisma.auditLog.findFirst({
          where: { sequence: event.sequence - 1 },
        })
      : null;

  const validationErrors = validateAuditLogEntry(event, previous);
  const metadata = event.metadataJson
    ? JSON.stringify(JSON.parse(event.metadataJson), null, 2)
    : null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-slate-100">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Audit Log
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Event #{event.sequence}
          </h1>
          <p className="mt-2 text-sm text-slate-400">{event.summary}</p>
        </div>
        <TestnetWarning />
      </div>

      <section className="mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">Timestamp</dt>
            <dd className="mt-1 text-sm">{event.timestamp.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Action</dt>
            <dd className="mt-1 font-mono text-sm text-cyan-300">{event.action}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Category</dt>
            <dd className="mt-1 text-sm">{event.category}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Severity / Outcome</dt>
            <dd className="mt-1 text-sm">
              {event.severity} · {event.outcome}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Actor</dt>
            <dd className="mt-1 text-sm">
              {event.actorName ?? "—"}
              {event.actorEmail ? ` (${event.actorEmail})` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Actor Role</dt>
            <dd className="mt-1 text-sm">{event.actorRole ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Target</dt>
            <dd className="mt-1 text-sm">
              {event.targetType ?? "—"}
              {event.targetLabel ? ` · ${event.targetLabel}` : ""}
              {event.targetId ? ` (${event.targetId})` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Route / Method</dt>
            <dd className="mt-1 text-sm">
              {event.route ?? "—"} {event.method ? `· ${event.method}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Permission</dt>
            <dd className="mt-1 text-sm">{event.permission ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Entry Validation</dt>
            <dd className={`mt-1 text-sm ${validationErrors.length === 0 ? "text-emerald-300" : "text-red-300"}`}>
              {validationErrors.length === 0 ? "Valid" : validationErrors.join(" ")}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="mb-3 text-sm font-medium uppercase text-slate-400">Hash Chain</h2>
        <dl className="space-y-3 font-mono text-xs break-all">
          <div>
            <dt className="text-slate-500">Previous Audit Hash</dt>
            <dd className="mt-1 text-slate-300">{event.previousAuditHash}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Audit Hash</dt>
            <dd className="mt-1 text-slate-300">{event.auditHash}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Short Hash</dt>
            <dd className="mt-1 text-slate-400">{shortenHash(event.auditHash, 12, 8)}</dd>
          </div>
        </dl>
      </section>

      {metadata && (
        <section className="mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="mb-3 text-sm font-medium uppercase text-slate-400">Metadata</h2>
          <pre className="overflow-x-auto text-xs leading-relaxed text-slate-300">{metadata}</pre>
        </section>
      )}

      <Link href="/audit" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Back to Audit Log
      </Link>
    </main>
  );
}
