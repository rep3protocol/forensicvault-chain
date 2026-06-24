import Link from "next/link";
import { connection } from "next/server";
import { requirePermission } from "@/lib/auth/requirePermission";
import { tamperWithBlock, restoreLatestTamperBackup } from "@/app/tamper-test/actions";
import { shortenHash } from "@/lib/format";
import { validateLedgerChain } from "@/lib/ledgerValidation";
import { prisma } from "@/lib/prisma";

export default async function TamperTestPage() {
  await connection();
  await requirePermission("USE_TAMPER_TEST");

  const [blocks, totalBlocks, latestBlock, validation] = await Promise.all([
    prisma.ledgerBlock.findMany({
      orderBy: { height: "asc" },
      include: {
        _count: { select: { transactions: true } },
      },
    }),
    prisma.ledgerBlock.count(),
    prisma.ledgerBlock.findFirst({
      orderBy: { height: "desc" },
    }),
    validateLedgerChain(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 rounded-lg border border-amber-500/50 bg-amber-950/30 px-5 py-4">
        <p className="text-sm font-semibold tracking-wide text-amber-200 uppercase">
          DEV-ONLY DESTRUCTIVE TESTING TOOL
        </p>
        <p className="mt-1 text-sm font-semibold tracking-wide text-amber-100 uppercase">
          LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.
        </p>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Ledger Tamper Test
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Break a local block payload and confirm validation catches it.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
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
          <form action={restoreLatestTamperBackup}>
            <button
              type="submit"
              className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
            >
              Restore latest tamper backup
            </button>
          </form>
        </div>
      </div>

      <section
        className={`mb-8 rounded-lg border px-5 py-4 ${
          validation.valid
            ? "border-emerald-700/60 bg-emerald-950/30"
            : "border-red-700/70 bg-red-950/40"
        }`}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Total Blocks
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">
              {totalBlocks}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Latest Height
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">
              {latestBlock?.height ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Latest Hash
            </p>
            <p
              className="mt-2 font-mono text-xs text-slate-200"
              title={latestBlock?.blockHash ?? undefined}
            >
              {latestBlock ? shortenHash(latestBlock.blockHash, 12, 8) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              Validation
            </p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                validation.valid ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {validation.valid ? "Valid" : "Invalid"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Checked {validation.checkedBlocks} blocks
            </p>
          </div>
        </div>

        {!validation.valid && (
          <div className="mt-5 border-t border-red-800/70 pt-4">
            <p className="text-sm font-medium text-red-200">
              Validation errors
            </p>
            <ul className="mt-2 space-y-2">
              {validation.errors.map((error) => (
                <li key={error} className="font-mono text-xs text-red-100/90">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-6 py-12 text-center">
          <p className="text-sm text-slate-400">No ledger blocks yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[72rem] text-left text-sm">
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
                  Transactions
                </th>
                <th className="px-4 py-3 font-medium text-slate-400">Action</th>
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
                  <td className="px-4 py-3 text-slate-400">
                    {block._count.transactions}
                  </td>
                  <td className="px-4 py-3">
                    <form action={tamperWithBlock}>
                      <input type="hidden" name="blockId" value={block.id} />
                      <button
                        type="submit"
                        className="rounded border border-red-800 bg-red-950/60 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:border-red-600 hover:bg-red-900/70"
                      >
                        Tamper with this block
                      </button>
                    </form>
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
