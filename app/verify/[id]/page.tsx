import Link from "next/link";
import { notFound } from "next/navigation";
import { TestnetWarning } from "@/components/TestnetWarning";
import { requirePermission } from "@/lib/auth/requirePermission";
import { shortenHash } from "@/lib/format";
import { FEES, TEST_VAULT_SYMBOL } from "@/lib/token/testVault";
import { prisma } from "@/lib/prisma";
import { verifyEvidence } from "./actions";

type VerifyEvidencePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ verified?: string }>;
};

export default async function VerifyEvidencePage({
  params,
  searchParams,
}: VerifyEvidencePageProps) {
  const { id } = await params;
  await requirePermission("VERIFY_EVIDENCE");
  const { verified } = await searchParams;
  const showResult = verified === "1";

  const evidence = await prisma.evidenceItem.findUnique({
    where: { id },
    include: {
      case: { select: { title: true, id: true } },
      verifications: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!evidence) {
    notFound();
  }

  const latestVerification = evidence.verifications[0] ?? null;
  const verifyEvidenceForItem = verifyEvidence.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/verify"
          className="text-sm text-slate-500 hover:text-slate-300"
        >
          ← Back to Verify
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Verify Evidence
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {evidence.originalName}
          </p>
        </div>
        <TestnetWarning />
      </div>

      <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
        Verification fee:{" "}
        <span className="font-medium text-cyan-300">
          {FEES.VERIFY_EVIDENCE} {TEST_VAULT_SYMBOL}
        </span>
        . {TEST_VAULT_SYMBOL} is a fake local test token with no real value.
      </div>

      {showResult && latestVerification && (
        <section
          className={`mb-8 rounded-lg border p-6 ${
            latestVerification.matched
              ? "border-emerald-800/60 bg-emerald-950/20"
              : "border-red-800/60 bg-red-950/20"
          }`}
        >
          <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
            Verification Result
          </h2>
          <div className="mb-4">
            <span
              className={`inline-flex rounded px-3 py-1 text-sm font-semibold ${
                latestVerification.matched
                  ? "bg-emerald-900/50 text-emerald-300"
                  : "bg-red-900/50 text-red-300"
              }`}
            >
              {latestVerification.matched ? "MATCH" : "FAILED"}
            </span>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Original Hash
              </dt>
              <dd
                className="mt-1 font-mono text-xs text-slate-300"
                title={latestVerification.originalHash}
              >
                {latestVerification.originalHash}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Provided Hash
              </dt>
              <dd
                className="mt-1 font-mono text-xs text-slate-300"
                title={latestVerification.providedHash}
              >
                {latestVerification.providedHash}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Ledger Chain Valid
              </dt>
              <dd className="mt-1 text-slate-200">
                {latestVerification.chainValid ? "Yes" : "No"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Integrity Score
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-cyan-300">
                {latestVerification.integrityScore}
              </dd>
            </div>
            {latestVerification.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-slate-500">Notes</dt>
                <dd className="mt-1 text-sm text-slate-400">
                  {latestVerification.notes}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Registered Evidence
        </h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-500">File Name</dt>
            <dd className="mt-1 text-slate-200">{evidence.originalName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Case</dt>
            <dd className="mt-1">
              <Link
                href={`/cases/${evidence.case.id}`}
                className="text-cyan-400 hover:text-cyan-300"
              >
                {evidence.case.title}
              </Link>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-500">
              Original SHA-256
            </dt>
            <dd
              className="mt-1 break-all font-mono text-xs text-slate-400"
              title={evidence.sha256Hash}
            >
              {evidence.sha256Hash}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">
              Registered Block Height
            </dt>
            <dd className="mt-1 font-mono text-cyan-300">
              {evidence.registeredBlockHeight ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">
              Registered Tx Hash
            </dt>
            <dd
              className="mt-1 font-mono text-xs text-slate-400"
              title={evidence.registeredTxHash ?? undefined}
            >
              {shortenHash(evidence.registeredTxHash, 12, 8)}
            </dd>
          </div>
        </dl>

        {latestVerification && !showResult && (
          <div className="mt-6 border-t border-slate-800 pt-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Latest Verification
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {latestVerification.matched ? "MATCH" : "FAILED"} · Score{" "}
              {latestVerification.integrityScore} ·{" "}
              {latestVerification.createdAt.toLocaleString()}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Upload Comparison File
        </h2>
        <p className="mb-4 text-sm text-slate-400">
          Upload a file to compare against the registered SHA-256 hash. The app
          will validate the local ledger chain and compute an integrity score.
        </p>
        <form action={verifyEvidenceForItem} className="grid gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">
              Comparison File <span className="text-red-400">*</span>
            </span>
            <input
              type="file"
              name="file"
              required
              className="block w-full text-sm text-slate-300 file:mr-4 file:rounded file:border-0 file:bg-cyan-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-cyan-700"
            />
          </label>
          <button
            type="submit"
            className="w-fit rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
          >
            Run Verification
          </button>
        </form>
      </section>
    </div>
  );
}
