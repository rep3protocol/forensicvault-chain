import Link from "next/link";
import { RoleBadge } from "@/components/RoleBadge";
import { TestnetWarning } from "@/components/TestnetWarning";
import { ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import { requirePermission } from "@/lib/auth/requirePermission";
import { prisma } from "@/lib/prisma";
import { updateUserRole } from "./actions";

export default async function AdminUsersPage() {
  await requirePermission("MANAGE_USERS");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      signingKeyFingerprint: true,
      wallets: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { balance: true },
      },
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-slate-100">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">User Management</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            Local MVP role management. This is not production-grade IAM.
          </p>
        </div>
        <TestnetWarning />
      </div>

      <section className="mb-8 rounded-lg border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm leading-relaxed text-amber-100/90">
        Permissions are enforced in server actions and page guards. Navigation hides
        unauthorized links, but server-side checks are the actual protection.
      </section>

      <section className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-slate-300 uppercase">
          Local Role Guide
        </h2>
        <dl className="grid gap-4 md:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-100">Admin</dt>
            <dd className="mt-1 text-sm text-slate-400">Full local control, including tamper test and user management.</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-100">Supervisor</dt>
            <dd className="mt-1 text-sm text-slate-400">Review, export, acknowledge, and clear Shield alerts.</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-100">Investigator</dt>
            <dd className="mt-1 text-sm text-slate-400">Create cases, upload evidence, verify, custody, and anchors.</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-100">Evidence Custodian</dt>
            <dd className="mt-1 text-sm text-slate-400">Evidence and custody focused workflow without case creation.</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-100">Viewer</dt>
            <dd className="mt-1 text-sm text-slate-400">Read-only access to cases, evidence, reports, ledger, anchors, and Shield.</dd>
          </div>
        </dl>
      </section>

      <section className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full min-w-[64rem] text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900/80">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-400">Name</th>
              <th className="px-4 py-3 font-medium text-slate-400">Email</th>
              <th className="px-4 py-3 font-medium text-slate-400">Role</th>
              <th className="px-4 py-3 font-medium text-slate-400">Created</th>
              <th className="px-4 py-3 font-medium text-slate-400">Signing Key Fingerprint</th>
              <th className="px-4 py-3 font-medium text-slate-400">Wallet Balance</th>
              <th className="px-4 py-3 font-medium text-slate-400">Change Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/30">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 font-medium text-slate-100">{user.name}</td>
                <td className="px-4 py-3 text-slate-400">{user.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {user.createdAt.toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {user.signingKeyFingerprint
                    ? `${user.signingKeyFingerprint.slice(0, 12)}…`
                    : "—"}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-300">
                  {user.wallets[0]?.balance ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <form action={updateUserRole} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <select
                      name="role"
                      defaultValue={user.role}
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-600"
                    >
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-6 text-sm text-slate-500">
        <Link href="/guard" className="text-cyan-300 hover:text-cyan-200">
          Open Shield
        </Link>{" "}
        to review local role configuration alerts.
      </p>
    </main>
  );
}
