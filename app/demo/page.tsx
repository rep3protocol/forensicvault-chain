import Link from "next/link";
import { TestnetWarning } from "@/components/TestnetWarning";
import { getCurrentUser } from "@/lib/auth/session";
import { getDuplicateCountsByHashes } from "@/lib/evidence/duplicates";
import { DEMO_CASE_TITLE_PREFIX } from "@/lib/demo/sampleData";
import { prisma } from "@/lib/prisma";
import { createDemoCase, resetDemoData } from "./actions";

async function getDemoStatus() {
  const demoCase = await prisma.case.findFirst({
    where: { title: { startsWith: DEMO_CASE_TITLE_PREFIX } },
    orderBy: { createdAt: "desc" },
    include: {
      evidence: {
        orderBy: { createdAt: "asc" },
        include: {
          verifications: true,
          custodyEvents: true,
        },
      },
    },
  });

  const latestBlock = await prisma.ledgerBlock.findFirst({
    orderBy: { height: "desc" },
  });

  if (!demoCase) {
    return {
      demoCase: null,
      evidenceCount: 0,
      duplicateHashGroupCount: 0,
      verificationCount: 0,
      custodyEventCount: 0,
      latestBlockHeight: latestBlock?.height ?? null,
    };
  }

  const duplicateCounts = await getDuplicateCountsByHashes(
    demoCase.evidence.map((item) => item.sha256Hash),
  );
  const duplicateHashGroupCount = [...duplicateCounts.values()].filter(
    (count) => count > 1,
  ).length;

  return {
    demoCase,
    evidenceCount: demoCase.evidence.length,
    duplicateHashGroupCount,
    verificationCount: demoCase.evidence.reduce(
      (total, item) => total + item.verifications.length,
      0,
    ),
    custodyEventCount: demoCase.evidence.reduce(
      (total, item) => total + item.custodyEvents.length,
      0,
    ),
    latestBlockHeight: latestBlock?.height ?? null,
  };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export default async function DemoPage() {
  const [user, status] = await Promise.all([getCurrentUser(), getDemoStatus()]);
  const demoCase = status.demoCase;
  const firstEvidence = demoCase?.evidence[0];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
            ForensicVault Chain Demo Mode
          </h1>
          <p className="mt-2 text-sm font-medium tracking-wide text-amber-200/80 uppercase">
            LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.
          </p>
          {user && (
            <p className="mt-2 text-sm text-slate-400">
              Demo owner: <span className="text-slate-200">{user.name}</span>
            </p>
          )}
        </div>
        <TestnetWarning />
      </div>

      <section className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 p-5 text-sm leading-relaxed text-amber-100/90">
        <p className="font-semibold text-amber-100">
          Demo actions are local test data only.
        </p>
        <p className="mt-2">
          This page is intended for training, screenshots, and product demos.
          Resetting demo data should not be treated as deleting real evidence.
          Reset removes demo application records and demo files only.
        </p>
        <p className="mt-2">
          The ledger may retain historical demo transactions if append-only
          behavior is preserved.
        </p>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Demo Case Exists" value={demoCase ? "Yes" : "No"} />
        <Stat label="Evidence Count" value={status.evidenceCount} />
        <Stat label="Duplicate Hash Groups" value={status.duplicateHashGroupCount} />
        <Stat label="Verification Count" value={status.verificationCount} />
        <Stat label="Custody Event Count" value={status.custodyEventCount} />
        <Stat label="Latest Block Height" value={status.latestBlockHeight ?? "N/A"} />
      </section>

      <section className="mb-8 flex flex-wrap gap-3">
        <form action={createDemoCase}>
          <button
            type="submit"
            disabled={Boolean(demoCase)}
            className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Demo Case
          </button>
        </form>
        <form action={resetDemoData}>
          <button
            type="submit"
            className="rounded border border-red-700 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-100 transition-colors hover:border-red-500 hover:bg-red-900/50"
          >
            Reset Demo Data
          </button>
        </form>
        {demoCase && (
          <Link
            href={`/cases/${demoCase.id}`}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Open Demo Case
          </Link>
        )}
        <Link
          href="/"
          className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
        >
          Back to Dashboard
        </Link>
      </section>

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-100">
          What This Demo Proves
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {[
            "SHA-256 detects identical content",
            "Duplicate filename is not required for duplicate hash",
            "Custody event links back to registration",
            "Reports and packets can be exported",
            "Anchors export current ledger tip/root",
          ].map((item) => (
            <li key={item} className="rounded border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-100">Quick Links</h2>
        <div className="flex flex-wrap gap-3">
          {demoCase && (
            <>
              <Link href={`/cases/${demoCase.id}`} className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                Open Demo Case
              </Link>
              <Link href={`/cases/${demoCase.id}/packet`} className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
                Open Case Packet
              </Link>
            </>
          )}
          {firstEvidence && (
            <Link href={`/evidence/${firstEvidence.id}`} className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
              Open Evidence Detail
            </Link>
          )}
          <Link href="/reports" className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
            Open Reports
          </Link>
          <Link href="/anchors" className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
            Open Anchors
          </Link>
          <Link href="/ledger" className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
            Open Ledger
          </Link>
          <Link href="/tamper-test" className="rounded border border-amber-600 bg-amber-950/40 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-900/40">
            Tamper Test
          </Link>
        </div>
      </section>
    </main>
  );
}
