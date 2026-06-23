import type { ShieldSeverity } from "@/lib/shield/types";

export const severityRank: Record<ShieldSeverity, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

export function compareSeverity(a: ShieldSeverity, b: ShieldSeverity) {
  return severityRank[b] - severityRank[a];
}

export function severityClassName(severity: ShieldSeverity) {
  switch (severity) {
    case "CRITICAL":
      return "border-red-500/60 bg-red-950/40 text-red-200";
    case "HIGH":
      return "border-orange-500/60 bg-orange-950/30 text-orange-200";
    case "MEDIUM":
      return "border-amber-500/60 bg-amber-950/30 text-amber-200";
    case "LOW":
      return "border-cyan-500/50 bg-cyan-950/20 text-cyan-200";
    case "INFO":
      return "border-emerald-500/50 bg-emerald-950/20 text-emerald-200";
  }
}
