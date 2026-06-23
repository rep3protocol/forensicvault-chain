import Link from "next/link";
import { TestnetWarning } from "@/components/TestnetWarning";
import { prisma } from "@/lib/prisma";

export default async function HealthPage() {
  let dbOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const health = {
    status: dbOk ? "ok" : "error",
    app: "ForensicVault Chain",
    database: "sqlite",
    token: "TEST_VAULT",
    warning: "TEST_VAULT is a fake local test token with no real value.",
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Health Check
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Application and database status. API endpoint:{" "}
            <Link
              href="/api/health"
              className="text-cyan-400 hover:text-cyan-300"
            >
              /api/health
            </Link>
          </p>
        </div>
        <TestnetWarning />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <span
            className={`inline-flex h-2.5 w-2.5 rounded-full ${
              health.status === "ok" ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm font-medium text-slate-200">
            Status: {health.status.toUpperCase()}
          </span>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-500">Application</dt>
            <dd className="mt-1 text-sm text-slate-200">{health.app}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Database</dt>
            <dd className="mt-1 text-sm text-slate-200">
              {health.database} {dbOk ? "(connected)" : "(unavailable)"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Token</dt>
            <dd className="mt-1 text-sm text-slate-200">{health.token}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-500">Warning</dt>
            <dd className="mt-1 text-sm text-amber-200/90">{health.warning}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
