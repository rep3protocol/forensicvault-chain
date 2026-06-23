import { TestnetWarning } from "@/components/TestnetWarning";
import { shortenHash } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function LedgerPage() {
  const [blocks, totalBlocks] = await Promise.all([
    prisma.ledgerBlock.findMany({
      orderBy: { height: "desc" },
      take: 50,
      include: {
        _count: { select: { transactions: true } },
      },
    }),
    prisma.ledgerBlock.count(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Ledger Explorer
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Local chain of custody and evidence registration blocks.
          </p>
          <p className="mt-2 text-xs font-medium tracking-wide text-amber-200/80 uppercase">
            Local development ledger only.
          </p>
        </div>
        <TestnetWarning />
      </div>

      <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/50 px-5 py-4">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Total Blocks
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">
          {totalBlocks}
        </p>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-6 py-12 text-center">
          <p className="text-sm text-slate-400">No ledger blocks yet.</p>
          <p className="mt-1 text-xs text-slate-500">
            Blocks will appear here when evidence is registered and custody
            events are anchored.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[64rem] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-400">Height</th>
                <th className="px-4 py-3 font-medium text-slate-400">
                  Timestamp
                </th>
                <th className="px-4 py-3 font-medium text-slate-400">
                  Previous Hash
                </th>
                <th className="px-4 py-3 font-medium text-slate-400">
                  Merkle Root
                </th>
                <th className="px-4 py-3 font-medium text-slate-400">
                  Block Hash
                </th>
                <th className="px-4 py-3 font-medium text-slate-400">
                  Validator
                </th>
                <th className="px-4 py-3 font-medium text-slate-400">
                  Transactions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/30">
              {blocks.map((block) => (
                <tr key={block.id}>
                  <td className="px-4 py-3 font-mono text-cyan-300">
                    {block.height}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {block.timestamp.toLocaleString()}
                  </td>
                  <td
                    className="px-4 py-3 font-mono text-xs text-slate-500"
                    title={block.previousHash}
                  >
                    {shortenHash(block.previousHash, 8, 6)}
                  </td>
                  <td
                    className="px-4 py-3 font-mono text-xs text-slate-500"
                    title={block.merkleRoot}
                  >
                    {shortenHash(block.merkleRoot)}
                  </td>
                  <td
                    className="px-4 py-3 font-mono text-xs text-slate-500"
                    title={block.blockHash}
                  >
                    {shortenHash(block.blockHash)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{block.validator}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {block._count.transactions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
