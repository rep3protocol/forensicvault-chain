import Link from "next/link";
import { RoleBadge } from "@/components/RoleBadge";
import { TestnetWarning } from "@/components/TestnetWarning";
import { getCurrentUserWithRole } from "@/lib/auth/requirePermission";

export default async function ForbiddenPage() {
  const session = await getCurrentUserWithRole();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-slate-100">
      <div className="mb-6">
        <TestnetWarning />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Access Denied</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        Your current local role does not allow this action. ForensicVault Chain
        uses local MVP role checks for workflow separation. This is not
        production-grade authorization.
      </p>
      {session ? (
        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-sm text-slate-300">
            Signed in as <span className="font-medium text-slate-100">{session.user.name}</span>
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-500">Role</span>
            <RoleBadge role={session.user.role} />
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-400">
          Sign in with a local account that has the required permission.
        </p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
        >
          Back to Dashboard
        </Link>
        {!session && (
          <Link
            href="/login"
            className="rounded border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
          >
            Log In
          </Link>
        )}
      </div>
    </main>
  );
}
