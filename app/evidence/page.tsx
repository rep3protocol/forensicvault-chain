import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { TestnetWarning } from "@/components/TestnetWarning";
import { requireCurrentUser } from "@/lib/auth/session";
import { getDuplicateCountsByHashes } from "@/lib/evidence/duplicates";
import { shortenHash } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type EvidenceInventoryPageProps = {
  searchParams: Promise<{
    q?: string;
    caseId?: string;
    status?: string;
    evidenceType?: string;
    duplicateOnly?: string;
    unverifiedOnly?: string;
    failedVerificationOnly?: string;
  }>;
};

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "";
}

function isOn(value: string | undefined) {
  return value === "true" || value === "on" || value === "1";
}

function optionValues(values: (string | null | undefined)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

export default async function EvidenceInventoryPage({
  searchParams,
}: EvidenceInventoryPageProps) {
  await requireCurrentUser();
  const query = await searchParams;
  const q = clean(query.q);
  const caseId = clean(query.caseId);
  const status = clean(query.status);
  const evidenceType = clean(query.evidenceType);
  const duplicateOnly = isOn(query.duplicateOnly);
  const unverifiedOnly = isOn(query.unverifiedOnly);
  const failedVerificationOnly = isOn(query.failedVerificationOnly);
  const where: Prisma.EvidenceItemWhereInput = {};

  if (q) {
    where.OR = [
      { originalName: { contains: q } },
      { sha256Hash: { contains: q } },
    ];
  }
  if (caseId) where.caseId = caseId;
  if (status) where.status = status;
  if (evidenceType) where.evidenceType = evidenceType;
  if (unverifiedOnly) where.verifications = { none: {} };
  if (failedVerificationOnly) where.verifications = { some: { matched: false } };

  const [evidenceItems, cases, filterOptions] = await Promise.all([
    prisma.evidenceItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        case: {
          select: {
            id: true,
            title: true,
          },
        },
        verifications: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            matched: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            verifications: true,
            custodyEvents: true,
          },
        },
      },
    }),
    prisma.case.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.evidenceItem.findMany({
      select: { status: true, evidenceType: true },
    }),
  ]);
  const duplicateCounts = await getDuplicateCountsByHashes(
    evidenceItems.map((item) => item.sha256Hash),
  );
  const visibleEvidence = duplicateOnly
    ? evidenceItems.filter((item) => (duplicateCounts.get(item.sha256Hash) ?? 0) > 1)
    : evidenceItems;
  const statusOptions = optionValues(filterOptions.map((item) => item.status));
  const typeOptions = optionValues(filterOptions.map((item) => item.evidenceType));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100">
            Evidence Inventory
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            Search registered evidence by filename, SHA-256, case, status,
            type, duplicate state, and verification state.
          </p>
        </div>
        <TestnetWarning />
      </div>

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
        <form className="grid gap-4 lg:grid-cols-4">
          <label className="lg:col-span-2">
            <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Filename or SHA-256
            </span>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by partial filename or hash"
              className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
            />
          </label>
          <label>
            <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Case
            </span>
            <select
              name="caseId"
              defaultValue={caseId}
              className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none"
            >
              <option value="">All cases</option>
              {cases.map((caseItem) => (
                <option key={caseItem.id} value={caseItem.id}>
                  {caseItem.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Status
            </span>
            <select
              name="status"
              defaultValue={status}
              className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none"
            >
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Evidence Type
            </span>
            <select
              name="evidenceType"
              defaultValue={evidenceType}
              className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none"
            >
              <option value="">All types</option>
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-4 lg:col-span-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="duplicateOnly"
                value="true"
                defaultChecked={duplicateOnly}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950"
              />
              Duplicate only
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="unverifiedOnly"
                value="true"
                defaultChecked={unverifiedOnly}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950"
              />
              Unverified only
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="failedVerificationOnly"
                value="true"
                defaultChecked={failedVerificationOnly}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950"
              />
              Failed verification only
            </label>
          </div>
          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
            >
              Apply Filters
            </button>
            <Link
              href="/evidence"
              className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium tracking-wide text-slate-300 uppercase">
            Results
          </h2>
          <p className="text-sm text-slate-500">
            {visibleEvidence.length} evidence item(s)
          </p>
        </div>
        {visibleEvidence.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-6 py-12 text-center">
            <p className="text-sm text-slate-400">
              No evidence matches the current filters.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Broaden the search or clear duplicate/verification filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[88rem] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-400">Evidence</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Case</th>
                  <th className="px-4 py-3 font-medium text-slate-400">SHA-256</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Type</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Created</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Latest Verification</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Verifications</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Custody</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Duplicates</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Block</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                {visibleEvidence.map((item) => {
                  const latestVerification = item.verifications[0];
                  const duplicateCount = duplicateCounts.get(item.sha256Hash) ?? 1;

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {item.originalName}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/cases/${item.case.id}`}
                          className="text-cyan-300 hover:text-cyan-200"
                        >
                          {item.case.title}
                        </Link>
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
                      <td className="px-4 py-3 text-slate-400">{item.evidenceType}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {item.createdAt.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {latestVerification ? (
                          <span
                            className={
                              latestVerification.matched
                                ? "text-emerald-300"
                                : "text-red-300"
                            }
                          >
                            {latestVerification.matched ? "MATCH" : "FAILED"}
                          </span>
                        ) : (
                          <span className="text-amber-300">UNVERIFIED</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-300">
                        {item._count.verifications}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-300">
                        {item._count.custodyEvents}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-300">
                        {duplicateCount > 1 ? duplicateCount : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-cyan-300">
                        {item.registeredBlockHeight ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/evidence/${item.id}`} className="text-cyan-300 hover:text-cyan-200">
                            Open
                          </Link>
                          <Link href={`/verify/${item.id}`} className="text-cyan-300 hover:text-cyan-200">
                            Verify
                          </Link>
                          <Link href={`/reports/${item.id}`} className="text-cyan-300 hover:text-cyan-200">
                            Report
                          </Link>
                        </div>
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
