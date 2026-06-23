import Link from "next/link";
import { TestnetWarning } from "@/components/TestnetWarning";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureWalletForUser } from "@/lib/auth/wallet";
import { DEFAULT_WALLET_ADDRESS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const currentUserWallet = currentUser ? await ensureWalletForUser(currentUser) : null;
  const [
    totalCases,
    totalEvidence,
    totalCustodyEvents,
    totalLedgerBlocks,
    totalVerifications,
    defaultWallet,
    latestVerification,
  ] = await Promise.all([
    prisma.case.count(),
    prisma.evidenceItem.count(),
    prisma.custodyEvent.count(),
    prisma.ledgerBlock.count(),
    prisma.verification.count(),
    prisma.wallet.findUnique({
      where: { address: DEFAULT_WALLET_ADDRESS },
    }),
    prisma.verification.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        evidence: { select: { originalName: true } },
      },
    }),
  ]);
  const wallet = currentUserWallet ?? defaultWallet;

  const stats = [
    { label: "Total Cases", value: totalCases },
    { label: "Evidence Items", value: totalEvidence },
    { label: "Verifications", value: totalVerifications },
    { label: "Custody Events", value: totalCustodyEvents },
    { label: "Ledger Blocks", value: totalLedgerBlocks },
    {
      label: "TEST_VAULT Balance",
      value: wallet ? `${wallet.balance.toLocaleString()} TEST_VAULT` : "—",
      highlight: true,
    },
  ];

  const actions = [
    { href: "/cases", label: "Create Case", primary: true },
    { href: "/cases", label: "View Cases" },
    { href: "/verify", label: "Verify Evidence" },
    { href: "/ledger", label: "Ledger Explorer" },
    { href: "/wallet", label: "Wallet" },
    { href: "/health", label: "Health Check" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
            ForensicVault Chain
          </h1>
          <p className="mt-2 text-base text-slate-400">
            Verify evidence. Prove custody. Protect truth.
          </p>
          <div className="mt-4">
            <TestnetWarning />
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-5 py-4 text-sm text-slate-400">
          <p className="font-medium text-slate-300">Local-first MVP</p>
          <p className="mt-1 text-xs leading-relaxed">
            SQLite database · Prisma ORM · Fake TEST_VAULT ledger · No external
            networks
          </p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          System Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-lg border p-5 ${
                stat.highlight
                  ? "border-cyan-800/60 bg-cyan-950/20"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                {stat.label}
              </p>
              <p
                className={`mt-2 text-2xl font-semibold tabular-nums ${
                  stat.highlight ? "text-cyan-300" : "text-slate-100"
                }`}
              >
                {stat.value}
              </p>
              {stat.highlight && (
                <p className="mt-2 text-xs text-amber-200/80">
                  Fake local token — no real value
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {latestVerification && (
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
            Latest Verification
          </h2>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-200">
                  {latestVerification.evidence.originalName}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {latestVerification.createdAt.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`inline-flex rounded px-2.5 py-1 text-xs font-semibold ${
                    latestVerification.matched
                      ? "bg-emerald-900/50 text-emerald-300"
                      : "bg-red-900/50 text-red-300"
                  }`}
                >
                  {latestVerification.matched ? "MATCH" : "FAILED"}
                </span>
                <span className="text-sm text-slate-400">
                  Score{" "}
                  <span className="font-semibold text-cyan-300">
                    {latestVerification.integrityScore}
                  </span>
                </span>
                <Link
                  href={`/verify/${latestVerification.evidenceId}`}
                  className="text-sm text-cyan-400 hover:text-cyan-300"
                >
                  View →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={
                action.primary
                  ? "rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
                  : "rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
        <div className="mt-4">
          <Link
            href="/tamper-test"
            className="text-xs font-medium tracking-wide text-amber-300/80 uppercase hover:text-amber-200"
          >
            Dev-only tamper test
          </Link>
        </div>
      </section>
    </div>
  );
}
