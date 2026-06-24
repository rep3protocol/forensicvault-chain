import { roleLabel } from "@/lib/auth/roles";

type RoleBadgeProps = {
  role: string | null | undefined;
  className?: string;
};

function roleClassName(role: string | null | undefined) {
  switch (roleLabel(role)) {
    case "Admin":
      return "border-purple-500/40 bg-purple-500/10 text-purple-200";
    case "Supervisor":
      return "border-cyan-500/40 bg-cyan-500/10 text-cyan-200";
    case "Investigator":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
    case "Evidence Custodian":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    case "Viewer":
      return "border-slate-500/40 bg-slate-500/10 text-slate-300";
    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-300";
  }
}

export function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold ${roleClassName(role)} ${className}`}
    >
      {roleLabel(role)}
    </span>
  );
}
