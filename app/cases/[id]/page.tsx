import Link from "next/link";
import { notFound } from "next/navigation";
import { TestnetWarning } from "@/components/TestnetWarning";
import { getDuplicateCountsByHashes } from "@/lib/evidence/duplicates";
import { shortenHash } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type CaseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { id } = await params;

  const caseItem = await prisma.case.findUnique({
    where: { id },
    include: {
      evidence: {
        orderBy: { createdAt: "desc" },
      },
      owner: true,
    },
  });

  if (!caseItem) {
    notFound();
  }

  const duplicateCounts = await getDuplicateCountsByHashes(
    caseItem.evidence.map((item) => item.sha256Hash),
  );
  const hasDuplicateHash = (hash: string) => (duplicateCounts.get(hash) ?? 0) > 1;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <Link
          href="/cases"
          className="text-sm text-slate-500 hover:text-slate-300"
        >
          ← Back to Cases
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
              {caseItem.title}
            </h1>
            <span className="inline-flex rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-cyan-300">
              {caseItem.status}
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Created {caseItem.createdAt.toLocaleString()}
            {caseItem.owner ? ` · Owner: ${caseItem.owner.name}` : ""}
          </p>
        </div>
        <TestnetWarning />
      </div>

      <div className="mb-10 grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
            Case Details
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">Description</dt>
              <dd className="mt-1 text-sm text-slate-200">
                {caseItem.description ?? "No description provided."}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Jurisdiction
              </dt>
              <dd className="mt-1 text-sm text-slate-200">
                {caseItem.jurisdiction ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Tags</dt>
              <dd className="mt-1 text-sm text-slate-200">
                {caseItem.tags ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Case ID</dt>
              <dd className="mt-1 font-mono text-xs text-slate-400">
                {caseItem.id}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
            Actions
          </h2>
          <Link
            href={`/cases/${caseItem.id}/evidence/new`}
            className="block w-full rounded bg-cyan-700 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-cyan-600"
          >
            Add Evidence
          </Link>
          <p className="mt-3 text-xs text-slate-500">
            Upload a file to compute SHA-256, register on the local ledger, and
            deduct 10 TEST_VAULT.
          </p>
        </section>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Evidence ({caseItem.evidence.length})
        </h2>
        {caseItem.evidence.length > 0 && (
          <p className="mb-4 text-sm text-slate-400">
            Identical SHA-256 means identical file content, even if filenames differ.
          </p>
        )}
        {caseItem.evidence.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-6 py-12 text-center">
            <p className="text-sm text-slate-400">
              No evidence registered yet.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Use Add Evidence to upload files and anchor them on the local
              ledger.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-400">
                    Original File Name
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400">
                    Evidence Type
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400">
                    SHA-256
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400">
                    Block Height
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400">
                    Tx Hash
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400">
                    Created
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                {caseItem.evidence.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/evidence/${item.id}`}
                        className="text-slate-100 hover:text-cyan-300"
                      >
                        {item.originalName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {item.evidenceType}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="font-mono text-xs text-slate-500"
                            title={item.sha256Hash}
                          >
                            {shortenHash(item.sha256Hash)}
                          </span>
                          {hasDuplicateHash(item.sha256Hash) && (
                            <span className="inline-flex rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-200">
                              Duplicate hash
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-cyan-300">
                      {item.registeredBlockHeight ?? "—"}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs text-slate-500"
                      title={item.registeredTxHash ?? undefined}
                    >
                      {shortenHash(item.registeredTxHash)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {item.createdAt.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/verify/${item.id}`}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        Verify →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
