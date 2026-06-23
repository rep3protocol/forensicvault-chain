import Link from "next/link";
import { TestnetWarning } from "@/components/TestnetWarning";
import { register } from "./actions";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Register Investigator
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Create a local MVP investigator account and a fake TEST_VAULT wallet.
        </p>
        <div className="mt-4 space-y-3">
          <TestnetWarning />
          <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold tracking-wide text-amber-200 uppercase">
            LOCAL MVP AUTH - NOT PRODUCTION SECURITY.
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <form action={register} className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-slate-400">Name</span>
            <input
              name="name"
              required
              autoComplete="name"
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-slate-400">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-slate-400">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-slate-400">Role</span>
            <input
              name="role"
              defaultValue="Investigator"
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
          >
            Register
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-400">
          Already have a local account?{" "}
          <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
            Log in
          </Link>
        </p>
      </section>
    </div>
  );
}
