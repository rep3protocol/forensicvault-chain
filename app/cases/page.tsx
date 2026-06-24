import Link from "next/link";
import { TestnetWarning } from "@/components/TestnetWarning";
import { can } from "@/lib/auth/permissions";
import { getCurrentUserWithRole, requirePermission } from "@/lib/auth/requirePermission";
import { prisma } from "@/lib/prisma";
import { createCase } from "./actions";

export default async function CasesPage() {
  await requirePermission("VIEW_CASES");
  const session = await getCurrentUserWithRole();
  const canCreateCase = session ? can(session.role, "CREATE_CASE") : false;

  const cases = await prisma.case.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { evidence: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Cases
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage forensic investigations and linked evidence.
          </p>
        </div>
        <TestnetWarning />
      </div>

      <section className="mb-10 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Create Case
        </h2>
        {canCreateCase ? (
        <form action={createCase} className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-slate-400">
              Title <span className="text-red-400">*</span>
            </span>
            <input
              name="title"
              required
              placeholder="Case title"
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-slate-400">
              Description
            </span>
            <textarea
              name="description"
              rows={3}
              placeholder="Optional case summary"
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">
              Jurisdiction
            </span>
            <input
              name="jurisdiction"
              placeholder="e.g. County District Court"
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">Tags</span>
            <input
              name="tags"
              placeholder="Comma-separated tags"
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
            >
              Create Case
            </button>
          </div>
        </form>
        ) : (
          <p className="text-sm text-slate-400">
            Your current local role cannot create cases. Contact a local Admin if you need access.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          All Cases ({cases.length})
        </h2>
        {cases.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-6 py-12 text-center">
            <p className="text-sm text-slate-400">No cases yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Create your first case using the form above.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-400">Title</th>
                  <th className="px-4 py-3 font-medium text-slate-400">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-400">
                    Jurisdiction
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400">
                    Created
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400">
                    Evidence
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-400" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                {cases.map((caseItem) => (
                  <tr key={caseItem.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {caseItem.title}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-cyan-300">
                        {caseItem.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {caseItem.jurisdiction ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {caseItem.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {caseItem._count.evidence}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/cases/${caseItem.id}`}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        Open →
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
