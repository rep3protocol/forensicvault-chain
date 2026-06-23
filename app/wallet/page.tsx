import { TestnetWarning } from "@/components/TestnetWarning";
import {
  DEFAULT_WALLET_ADDRESS,
  TEST_VAULT_SYMBOL,
} from "@/lib/token/testVault";
import { prisma } from "@/lib/prisma";

export default async function WalletPage() {
  const wallet = await prisma.wallet.findUnique({
    where: { address: DEFAULT_WALLET_ADDRESS },
  });

  const transactions = await prisma.tokenTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Wallet
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Local {TEST_VAULT_SYMBOL} balance for ledger fees and operations.
          </p>
        </div>
        <TestnetWarning />
      </div>

      <div className="mb-8 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100/90">
        {TEST_VAULT_SYMBOL} is a fake local test token with no real value. It
        cannot be exchanged, transferred off this system, or converted to real
        currency.
      </div>

      {wallet ? (
        <section className="mb-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-cyan-800/60 bg-cyan-950/20 p-6">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Balance
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-cyan-300">
              {wallet.balance.toLocaleString()}{" "}
              <span className="text-lg text-cyan-400/70">{TEST_VAULT_SYMBOL}</span>
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">Label</dt>
                <dd className="mt-0.5 text-slate-200">{wallet.label}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Address</dt>
                <dd className="mt-0.5 font-mono text-xs text-slate-400">
                  {wallet.address}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">
                  Public Key
                </dt>
                <dd className="mt-0.5 font-mono text-xs text-slate-400">
                  {wallet.publicKey ?? "—"}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      ) : (
        <div className="mb-10 rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-6 py-8 text-center">
          <p className="text-sm text-slate-400">No default wallet found.</p>
          <p className="mt-1 text-xs text-slate-500">
            Run{" "}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-300">
              GET /api/dev/seed
            </code>{" "}
            to create the local dev wallet.
          </p>
        </div>
      )}

      <section>
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Token Transaction History
        </h2>
        {transactions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-6 py-10 text-center">
            <p className="text-sm text-slate-400">No transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-400">Type</th>
                  <th className="px-4 py-3 font-medium text-slate-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400">From</th>
                  <th className="px-4 py-3 font-medium text-slate-400">To</th>
                  <th className="px-4 py-3 font-medium text-slate-400">
                    Reason
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 text-slate-300">{tx.type}</td>
                    <td className="px-4 py-3 font-mono text-slate-200">
                      {tx.amount} {TEST_VAULT_SYMBOL}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {tx.fromWallet ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {tx.toWallet ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {tx.reason ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {tx.createdAt.toLocaleString()}
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
