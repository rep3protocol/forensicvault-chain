import Link from "next/link";
import { prisma } from "@/lib/prisma";

function shortHash(hash?: string | null) {
  if (!hash) return "Pending";
  return hash.length > 20 ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : hash;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export default async function ReportsPage() {
  const evidenceItems = await prisma.evidenceItem.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      case: true,
      verifications: {
        orderBy: { createdAt: "desc" },
      },
      custodyEvents: true,
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-slate-100">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Evidence Integrity Reports</h1>
        <p className="mt-2 text-slate-400">
          Generate printable forensic integrity summaries for registered evidence.
        </p>

        <div className="mt-4 inline-block rounded-lg border border-amber-500/50 px-4 py-2 text-sm font-semibold text-amber-300">
          LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.
        </div>
      </div>

      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        {evidenceItems.length === 0 ? (
          <p className="text-slate-400">No evidence registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-3 pr-4">Original File Name</th>
                  <th className="py-3 pr-4">Case</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">SHA-256</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Block</th>
                  <th className="py-3 pr-4">Latest Verification</th>
                  <th className="py-3 pr-4">Custody Events</th>
                  <th className="py-3 pr-4">Created</th>
                  <th className="py-3 pr-4"></th>
                </tr>
              </thead>

              <tbody>
                {evidenceItems.map((item) => {
                  const latest = item.verifications[0];

                  return (
                    <tr key={item.id} className="border-b border-slate-800">
                      <td className="py-3 pr-4">{item.originalName}</td>
                      <td className="py-3 pr-4">{item.case.title}</td>
                      <td className="py-3 pr-4">{item.evidenceType}</td>
                      <td className="py-3 pr-4 font-mono">{shortHash(item.sha256Hash)}</td>
                      <td className="py-3 pr-4">{item.status}</td>
                      <td className="py-3 pr-4">{item.registeredBlockHeight ?? "Pending"}</td>
                      <td className="py-3 pr-4">
                        {latest
                          ? `${latest.matched ? "MATCH" : "FAILED"} · Score ${latest.integrityScore}`
                          : "Not verified"}
                      </td>
                      <td className="py-3 pr-4">{item.custodyEvents.length}</td>
                      <td className="py-3 pr-4">{formatDate(item.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <Link href={`/reports/${item.id}`} className="text-cyan-300 hover:text-cyan-200">
                          Open Report →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
