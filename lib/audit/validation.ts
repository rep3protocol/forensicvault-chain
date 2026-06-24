import type { AuditLog } from "@prisma/client";
import { buildAuditHashPayload, computeAuditHash } from "@/lib/audit/hash";
import { GENESIS_AUDIT_HASH } from "@/lib/audit/types";

export type AuditChainValidationResult = {
  valid: boolean;
  totalEvents: number;
  checkedEvents: number;
  errors: string[];
  latestSequence: number | null;
  latestAuditHash: string | null;
};

export function validateAuditLogEntry(
  entry: AuditLog,
  previous: AuditLog | null,
): string[] {
  const errors: string[] = [];

  if (!previous) {
    if (entry.previousAuditHash !== GENESIS_AUDIT_HASH) {
      errors.push(
        `Sequence ${entry.sequence}: expected previousAuditHash GENESIS, got ${entry.previousAuditHash}.`,
      );
    }
  } else if (entry.previousAuditHash !== previous.auditHash) {
    errors.push(
      `Sequence ${entry.sequence}: previousAuditHash does not match prior auditHash.`,
    );
  }

  const expectedHash = computeAuditHash(
    buildAuditHashPayload({
      sequence: entry.sequence,
      timestamp: entry.timestamp,
      actorId: entry.actorId,
      actorName: entry.actorName,
      actorEmail: entry.actorEmail,
      actorRole: entry.actorRole,
      action: entry.action,
      category: entry.category,
      severity: entry.severity,
      outcome: entry.outcome,
      targetType: entry.targetType,
      targetId: entry.targetId,
      targetLabel: entry.targetLabel,
      route: entry.route,
      method: entry.method,
      permission: entry.permission,
      summary: entry.summary,
      metadataJson: entry.metadataJson,
      previousAuditHash: entry.previousAuditHash,
    }),
  );

  if (entry.auditHash !== expectedHash) {
    errors.push(`Sequence ${entry.sequence}: auditHash does not match recomputed hash.`);
  }

  return errors;
}

export async function validateAuditLogChain(
  entries?: AuditLog[],
): Promise<AuditChainValidationResult> {
  const { prisma } = await import("@/lib/prisma");
  const logs =
    entries ??
    (await prisma.auditLog.findMany({
      orderBy: { sequence: "asc" },
    }));

  const errors: string[] = [];

  for (let index = 0; index < logs.length; index++) {
    const entry = logs[index];
    const previous = index > 0 ? logs[index - 1] : null;
    errors.push(...validateAuditLogEntry(entry, previous));
  }

  const latest = logs.length > 0 ? logs[logs.length - 1] : null;

  return {
    valid: errors.length === 0,
    totalEvents: logs.length,
    checkedEvents: logs.length,
    errors,
    latestSequence: latest?.sequence ?? null,
    latestAuditHash: latest?.auditHash ?? null,
  };
}

export async function getAuditLogSummary() {
  const validation = await validateAuditLogChain();
  const { prisma } = await import("@/lib/prisma");

  const [deniedCount, highCount, criticalCount] = await Promise.all([
    prisma.auditLog.count({ where: { outcome: "DENIED" } }),
    prisma.auditLog.count({ where: { severity: "HIGH" } }),
    prisma.auditLog.count({ where: { severity: "CRITICAL" } }),
  ]);

  const recentDenied = await prisma.auditLog.count({
    where: {
      outcome: "DENIED",
      timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });

  const recentHigh = await prisma.auditLog.count({
    where: {
      severity: { in: ["HIGH", "CRITICAL"] },
      timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });

  return {
    validation,
    deniedCount,
    highCount,
    criticalCount,
    recentDenied,
    recentHigh,
    failedOrErrorCount: await prisma.auditLog.count({
      where: { outcome: { in: ["FAILURE", "ERROR"] } },
    }),
  };
}
