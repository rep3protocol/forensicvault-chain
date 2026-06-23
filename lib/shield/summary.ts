import type { ShieldAlert, ShieldMetrics, ShieldStatus } from "@/lib/shield/types";

export function countAlertsBySeverity(alerts: ShieldAlert[]) {
  return {
    CRITICAL: alerts.filter((alert) => alert.severity === "CRITICAL").length,
    HIGH: alerts.filter((alert) => alert.severity === "HIGH").length,
    MEDIUM: alerts.filter((alert) => alert.severity === "MEDIUM").length,
    LOW: alerts.filter((alert) => alert.severity === "LOW").length,
    INFO: alerts.filter((alert) => alert.severity === "INFO").length,
  };
}

export function computeShieldStatus(alerts: ShieldAlert[]): ShieldStatus {
  const counts = countAlertsBySeverity(alerts);

  if (counts.CRITICAL > 0) return "CRITICAL";
  if (counts.HIGH > 0) return "RISK";
  if (counts.MEDIUM > 0) return "WATCH";
  return "CLEAR";
}

export function getRecommendedActions(alerts: ShieldAlert[], metrics: ShieldMetrics) {
  const actions = new Set<string>();

  for (const alert of alerts) {
    if (alert.severity !== "INFO") {
      actions.add(alert.action);
    }
  }

  if (metrics.totalLedgerBlocks > 0) {
    actions.add("Export an external anchor after important ledger changes.");
  }

  if (actions.size === 0) {
    actions.add("Continue normal SHA-256 verification and external anchor exports.");
  }

  return [...actions];
}
