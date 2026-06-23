import Link from "next/link";
import { TestnetWarning } from "@/components/TestnetWarning";
import { shortenHash } from "@/lib/format";
import { FEES, TEST_VAULT_SYMBOL } from "@/lib/token/testVault";
import { prisma } from "@/lib/prisma";

export default async function VerifyPage() {
  const evidenceItems = await prisma.evidenceItem.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      case: { select: { title: true } },
      verifications: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Verify Evidence
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Compare uploaded files against registered SHA-256 hashes and
            validate the local ledger chain.
          </p>
        </div>
        <TestnetWarning />
      </div>

      <div className="mb-8 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100/90">
        Each verification costs {FEES.VERIFY_EVIDENCE} {TEST_VAULT_SYMBOL}.{" "}
        {TEST_VAULT_SYMBOL} is a fake local test token with no real value.
      </div>

      {evidenceItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-6 py-12 text-center">
          <p className="text-sm text-slate-400">No evidence registered yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Register evidence on a case before running verification.
          </p>
          <Link
            href="/cases"
            className="mt-4 inline-block text-sm text-cyan-400 hover:text-cyan-300"
          >
            Go to Cases →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-400">
                  File Name
                </th>
                <th className="px-4 py-3 font-medium text-slate-400">Case</th>
                <th className="px-4 py-3 font-medium text-slate-400">
                  SHA-256
                </th>
                <th className="px-4 py-3 font-medium text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-slate-400">
                  Latest Verification
                </th>
                <th className="px-4 py-3 font-medium text-slate-400" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/30">
              {evidenceItems.map((item) => {
                const latest = item.verifications[0];

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {item.originalName}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {item.case.title}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs text-slate-500"
                      title={item.sha256Hash}
                    >
                      {shortenHash(item.sha256Hash)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {latest ? (
                        <span
                          className={
                            latest.matched ? "text-emerald-400" : "text-red-400"
                          }
                        >
                          {latest.matched ? "MATCH" : "FAILED"} · Score{" "}
                          {latest.integrityScore}
                        </span>
                      ) : (
                        <span className="text-slate-500">Not verified</span>
                      )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
