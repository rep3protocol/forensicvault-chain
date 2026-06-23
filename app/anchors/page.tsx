import Link from "next/link";
import { TestnetWarning } from "@/components/TestnetWarning";
import { getAnchorExport, getAnchorText } from "@/lib/anchors/anchor";
import {
  compareCurrentAnchorToRecord,
  compareCurrentAnchorToLatestRecord,
  findDuplicateAnchorRecordForCurrent,
  getDuplicateAnchorRecordGroups,
  getAnchorRecords,
} from "@/lib/anchors/history";
import { formatHash } from "@/lib/format";
import { saveCurrentAnchorRecord, updateAnchorPublication } from "./actions";
import { CopyButton } from "./CopyButton";

function ValueCard({
  label,
  value,
  copyValue,
}: {
  label: string;
  value: React.ReactNode;
  copyValue?: string | null;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <div className="mt-2 overflow-hidden font-mono text-sm text-slate-100">
        {value}
      </div>
      {copyValue && (
        <div className="mt-4">
          <CopyButton label={`Copy ${label}`} value={copyValue} />
        </div>
      )}
    </div>
  );
}

function comparisonLabel(status: string) {
  switch (status) {
    case "MATCH":
      return "MATCH";
    case "CURRENT_AHEAD":
      return "CURRENT AHEAD";
    case "CURRENT_BEHIND":
      return "CURRENT BEHIND";
    case "NO_SAVED_ANCHOR":
      return "NO SAVED ANCHOR";
    case "NO_CURRENT_ANCHOR":
      return "NO CURRENT ANCHOR";
    default:
      return "MISMATCH";
  }
}

function comparisonClassName(status: string) {
  switch (status) {
    case "MATCH":
      return "bg-emerald-900/50 text-emerald-300";
    case "CURRENT_AHEAD":
      return "bg-amber-900/50 text-amber-300";
    case "CURRENT_BEHIND":
    case "MISMATCH":
      return "bg-red-900/50 text-red-300";
    default:
      return "bg-slate-800 text-slate-300";
  }
}

export default async function AnchorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    duplicateAnchor?: string;
    existingAnchorId?: string;
  }>;
}) {
  const query = await searchParams;
  const [anchor, records, latestComparison, currentDuplicate, duplicateGroups] =
    await Promise.all([
    getAnchorExport(),
    getAnchorRecords(),
    compareCurrentAnchorToLatestRecord(),
    findDuplicateAnchorRecordForCurrent(),
    getDuplicateAnchorRecordGroups(),
  ]);
  const recordComparisons = new Map(
    await Promise.all(
      records.map(async (record) => [
        record.id,
        await compareCurrentAnchorToRecord(record.id),
      ] as const),
    ),
  );
  const anchorText = getAnchorText(anchor);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-slate-500">
            ForensicVault Chain
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">
            External Anchor Export
          </h1>
          <p className="mt-2 text-sm font-medium tracking-wide text-amber-200/80 uppercase">
            LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.
          </p>
        </div>
        <TestnetWarning />
      </div>

      <section className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 p-5 text-sm leading-relaxed text-amber-100/90">
        <p className="font-semibold text-amber-100">
          This does not automatically publish anywhere.
        </p>
        <p className="mt-2">
          It creates a verifiable anchor file. To make silent local rewrites
          detectable, publish the latest block hash and ledger root somewhere
          outside this app.
        </p>
      </section>

      {(query.duplicateAnchor === "1" || currentDuplicate) && (
        <section className="mb-8 rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-5 text-sm leading-relaxed text-cyan-100/90">
          <p className="font-semibold text-cyan-100">
            An identical anchor snapshot already exists for this ledger state.
          </p>
          <p className="mt-2">
            Saving again will not create a duplicate by default. Add a label in
            the save form to update the existing snapshot label, or use
            Publication Tracking to update its URL and notes.
          </p>
          {currentDuplicate && (
            <p className="mt-2 font-mono text-xs text-cyan-100/80">
              Existing snapshot: {currentDuplicate.id} · height{" "}
              {currentDuplicate.latestBlockHeight}
            </p>
          )}
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Current Anchor
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ValueCard label="Latest Block Height" value={anchor.latestBlockHeight ?? "N/A"} />
        <ValueCard
          label="Latest Block Hash"
          value={formatHash(anchor.latestBlockHash)}
          copyValue={anchor.latestBlockHash}
        />
        <ValueCard
          label="Ledger Root"
          value={formatHash(anchor.ledgerRoot)}
          copyValue={anchor.ledgerRoot}
        />
        <ValueCard label="Total Ledger Blocks" value={anchor.totalLedgerBlocks} />
        <ValueCard label="Evidence Count" value={anchor.evidenceCount} />
        <ValueCard label="Custody Event Count" value={anchor.custodyEventCount} />
        <ValueCard label="Verification Count" value={anchor.verificationCount} />
        <ValueCard label="Case Count" value={anchor.caseCount} />
        <ValueCard label="Duplicate Hash Groups" value={anchor.duplicateHashGroupCount} />
        </div>
      </section>

      <section className="mb-8 flex flex-wrap gap-3">
        <a
          href="/anchors/download"
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          Download Anchor JSON
        </a>
        <a
          href="/anchors/download-text"
          className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
        >
          Download Anchor Text
        </a>
        <Link
          href="/"
          className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
        >
          Back to Dashboard
        </Link>
        <Link
          href="/ledger"
          className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
        >
          Open Ledger Explorer
        </Link>
      </section>

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Save Anchor Snapshot
        </h2>
        <form action={saveCurrentAnchorRecord} className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">Optional Label</span>
            <input
              name="label"
              placeholder="e.g. After demo case packet export"
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
            >
              Save Current Anchor Snapshot
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Saved snapshots stay local. Publish the hash and root elsewhere if you
          need external comparison later. If this ledger state is already saved,
          this form updates the existing snapshot label instead of creating a
          duplicate record.
        </p>
      </section>

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Anchor Comparison
        </h2>
        {latestComparison.recordId ? (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span
                className={`rounded px-2.5 py-1 text-xs font-semibold ${comparisonClassName(
                  latestComparison.status,
                )}`}
              >
                {comparisonLabel(latestComparison.status)}
              </span>
              <span className="text-sm text-slate-400">
                Compared {latestComparison.comparedAt.toLocaleString()}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <ValueCard
                label="Latest Block Hash Match"
                value={latestComparison.latestBlockHashMatches ? "Yes" : "No"}
              />
              <ValueCard
                label="Ledger Root Match"
                value={latestComparison.ledgerRootMatches ? "Yes" : "No"}
              />
              <ValueCard
                label="Current Height"
                value={latestComparison.currentLatestBlockHeight ?? "N/A"}
              />
              <ValueCard
                label="Saved Height"
                value={latestComparison.savedLatestBlockHeight ?? "N/A"}
              />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              {latestComparison.reason}
            </p>
            {!latestComparison.matches && (
              <div className="mt-4 rounded border border-amber-500/50 bg-amber-950/30 p-4 text-sm leading-relaxed text-amber-100/90">
                Current ledger values do not match this saved anchor snapshot.
                This may indicate local database rewrite, tampering, restore
                from old backup, or expected ledger growth depending on when the
                anchor was saved.
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            No saved anchor snapshot exists yet.
          </p>
        )}
      </section>

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Anchor History
        </h2>
        {duplicateGroups.length > 0 && (
          <div className="mb-5 rounded border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100/90">
            <p className="font-semibold text-amber-100">
              Duplicate saved anchor snapshots detected.
            </p>
            <p className="mt-1">
              {duplicateGroups.length} duplicate group(s) share the same
              latestBlockHeight, latestBlockHash, and ledgerRoot. Existing
              duplicates are not deleted automatically.
            </p>
          </div>
        )}
        {records.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-6 py-10 text-center">
            <p className="text-sm text-slate-400">
              No saved anchor snapshots yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[76rem] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-400">Created</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Label</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Height</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Latest Hash</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Ledger Root</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Created By</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Published</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Comparison</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                {records.map((record) => {
                  const comparison = recordComparisons.get(record.id);
                  const status = comparison?.status ?? "MISMATCH";

                  return (
                    <tr key={record.id}>
                      <td className="px-4 py-3 text-slate-400">
                        {record.createdAt.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {record.label ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-cyan-300">
                        {record.latestBlockHeight}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {formatHash(record.latestBlockHash)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {formatHash(record.ledgerRoot)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {record.createdByName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {record.publishedUrl ? "Tracked" : "Not tracked"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2.5 py-1 text-xs font-semibold ${comparisonClassName(
                            status,
                          )}`}
                        >
                          {comparisonLabel(status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {records.length > 0 && (
        <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
            Publication Tracking
          </h2>
          <div className="space-y-5">
            {records.map((record) => (
              <form
                key={record.id}
                action={updateAnchorPublication}
                className="rounded border border-slate-800 bg-slate-950/40 p-4"
              >
                <input type="hidden" name="id" value={record.id} />
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-200">
                      {record.label ?? `Anchor ${record.latestBlockHeight}`}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {formatHash(record.latestBlockHash)}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {record.createdAt.toLocaleString()}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-slate-400">
                      Published URL
                    </span>
                    <input
                      name="publishedUrl"
                      defaultValue={record.publishedUrl ?? ""}
                      placeholder="https://example.com/published-anchor"
                      className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-slate-400">
                      Publication Notes
                    </span>
                    <input
                      name="publicationNotes"
                      defaultValue={record.publicationNotes ?? ""}
                      placeholder="Where this was posted or recorded"
                      className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="mt-4 rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
                >
                  Save Publication Info
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium tracking-wide text-slate-300 uppercase">
            Copyable Anchor Text
          </h2>
          <CopyButton label="Copy Anchor Text" value={anchorText} />
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded border border-slate-800 bg-slate-950 p-4 font-mono text-sm leading-relaxed text-slate-200">
          {anchorText}
        </pre>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Instructions
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
          <li>Download the anchor JSON or text.</li>
          <li>Publish the latestBlockHash and ledgerRoot somewhere outside the app.</li>
          <li>Save the publication URL or receipt.</li>
          <li>Later, regenerate the anchor.</li>
          <li>
            If the values differ unexpectedly, investigate possible database
            rewrite or tampering.
          </li>
        </ol>
      </section>
    </main>
  );
}
