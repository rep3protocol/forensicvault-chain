import Link from "next/link";
import { TestnetWarning } from "@/components/TestnetWarning";
import { getAnchorExport, getAnchorText } from "@/lib/anchors/anchor";
import { formatHash } from "@/lib/format";
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

export default async function AnchorsPage() {
  const anchor = await getAnchorExport();
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

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
