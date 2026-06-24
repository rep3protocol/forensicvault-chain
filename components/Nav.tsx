import Link from "next/link";
import { canViewOwnerDiagnostics } from "@/lib/dev/owner";
import type { Permission } from "@/lib/auth/permissions";
import { can } from "@/lib/auth/permissions";
import { getCurrentUserWithRole } from "@/lib/auth/requirePermission";
import { RoleBadge } from "@/components/RoleBadge";

type NavLink = {
  href: string;
  label: string;
  permission?: Permission;
  ownerOnly?: boolean;
};

const links: NavLink[] = [
  { href: "/", label: "Dashboard", permission: "VIEW_DASHBOARD" },
  { href: "/getting-started", label: "Getting Started", permission: "VIEW_DASHBOARD" },
  { href: "/demo", label: "Demo", permission: "VIEW_DEMO" },
  { href: "/cases", label: "Cases", permission: "VIEW_CASES" },
  { href: "/evidence", label: "Evidence", permission: "VIEW_EVIDENCE" },
  { href: "/guard", label: "Shield", permission: "VIEW_SHIELD" },
  { href: "/audit", label: "Audit", permission: "VIEW_AUDIT_LOG" },
  { href: "/backups", label: "Backups", permission: "VIEW_BACKUPS" },
  { href: "/ledger", label: "Ledger", permission: "VIEW_LEDGER" },
  { href: "/anchors", label: "Anchors", permission: "VIEW_ANCHORS" },
  { href: "/wallet", label: "Wallet", permission: "VIEW_WALLET" },
  { href: "/verify", label: "Verify", permission: "VERIFY_EVIDENCE" },
  { href: "/tamper-test", label: "Tamper Test", permission: "USE_TAMPER_TEST" },
  { href: "/dev/diagnostics", label: "Diagnostics", ownerOnly: true },
  { href: "/admin/users", label: "Admin", permission: "MANAGE_USERS" },
];

export async function Nav() {
  const session = await getCurrentUserWithRole();
  const visibleLinks = session
    ? links.filter((link) => {
        if (link.ownerOnly) {
          return canViewOwnerDiagnostics(session.user);
        }
        return !link.permission || can(session.role, link.permission);
      })
    : links.filter((link) => !link.permission && !link.ownerOnly);

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
          {visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
            >
              {link.label}
            </Link>
          ))}
          {session ? (
            <>
              <span className="flex items-center gap-2 rounded border border-slate-800 px-3 py-1.5 text-sm text-slate-300">
                {session.user.name}
                <RoleBadge role={session.user.role} />
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
