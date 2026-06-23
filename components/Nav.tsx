import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/cases", label: "Cases" },
  { href: "/ledger", label: "Ledger" },
  { href: "/wallet", label: "Wallet" },
  { href: "/verify", label: "Verify" },
];

export async function Nav() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="group flex flex-col gap-0.5">
          <span className="text-sm font-semibold tracking-tight text-slate-100">
            ForensicVault Chain
          </span>
          <span className="text-xs text-slate-500 group-hover:text-slate-400">
            Local evidence ledger
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <span className="rounded border border-slate-800 px-3 py-1.5 text-sm text-slate-300">
                {user.name}
              </span>
              <Link
                href="/logout"
                className="rounded px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                Logout
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
