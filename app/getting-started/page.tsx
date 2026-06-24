import Link from "next/link";
import { TestnetWarning } from "@/components/TestnetWarning";
import { FirstRunHelper } from "@/components/FirstRunHelper";
import { requirePermission } from "@/lib/auth/requirePermission";
import { getOnboardingProgress } from "@/lib/onboarding/progress";

const workflow = [
  "Create case",
  "Add evidence",
  "Verify evidence",
  "Record custody",
  "Review ledger",
  "Export case packet",
  "Export anchor",
];

const pages = [
  ["Dashboard", "Operational overview, latest verification, wallet balance, and first-run checklist."],
  ["Cases", "Investigations and the evidence items linked to them."],
  ["Evidence", "File hash, registration transaction, duplicate hash warning, and custody timeline."],
  ["Verify", "Compare a later file against the original SHA-256 hash."],
  ["Ledger", "Local hash-linked block history for registrations, verifications, and custody events."],
  ["Reports", "Evidence integrity reports for individual evidence items."],
  ["Anchors", "Export latest block hash and ledger root for publication outside the app."],
  ["Wallet", "Fake TEST_VAULT fee history for local MVP actions."],
];

export default async function GettingStartedPage() {
  await requirePermission("VIEW_DASHBOARD");
  const progress = await getOnboardingProgress();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
            ForensicVault Chain Getting Started
          </h1>
          <p className="mt-2 text-sm font-medium tracking-wide text-amber-200/80 uppercase">
            LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.
          </p>
        </div>
        <TestnetWarning />
      </div>

      <FirstRunHelper progress={progress} />

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-3 text-xl font-semibold text-slate-100">What This App Does</h2>
        <p className="text-sm leading-relaxed text-slate-300">
          ForensicVault Chain registers digital evidence, hashes files with SHA-256,
          records custody events, verifies later files against original hashes,
          produces reports, and exports anchors.
        </p>
      </section>

      <section className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 p-6">
        <h2 className="mb-3 text-xl font-semibold text-amber-100">Important Limitation</h2>
        <p className="text-sm leading-relaxed text-amber-100/90">
          This is a local MVP/testnet. It is tamper-evident, not tamper-proof.
          External anchoring helps detect silent local database rewrites later.
        </p>
      </section>

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-100">Recommended Workflow</h2>
        <ol className="grid gap-3 md:grid-cols-2">
          {workflow.map((item, index) => (
            <li key={item} className="flex items-center gap-3 rounded border border-slate-800 bg-slate-950/50 p-3">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-700 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <span className="text-sm text-slate-200">{item}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-100">What Each Major Page Is For</h2>
        <dl className="grid gap-4 md:grid-cols-2">
          {pages.map(([page, description]) => (
            <div key={page}>
              <dt className="text-sm font-semibold text-slate-100">{page}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-slate-400">{description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-100">First Demo Flow</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
          <li>Create a case.</li>
          <li>Upload a PDF.</li>
          <li>Verify the same PDF.</li>
          <li>Add custody event.</li>
          <li>Download report.</li>
          <li>Download case packet.</li>
          <li>Export anchor.</li>
        </ol>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/demo"
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          Open Demo Mode
        </Link>
        <Link
          href={progress.nextAction.href}
          className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
        >
          {progress.allComplete ? "Open Dashboard" : progress.nextAction.label}
        </Link>
        <Link
          href="/"
          className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
        >
          Back to Dashboard
        </Link>
      </section>
    </main>
  );
}
