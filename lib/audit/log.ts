import type { User } from "@prisma/client";
import { buildAuditHashPayload, computeAuditHash } from "@/lib/audit/hash";
import { GENESIS_AUDIT_HASH, type RecordAuditEventInput } from "@/lib/audit/types";
import { stableJson } from "@/lib/crypto/hash";
import { prisma } from "@/lib/prisma";

const SENSITIVE_KEY_PATTERN =
  /password|passwordhash|signingprivatekey|privatekey|token|session|cookie|authorization|secret|local_dev_seed_password/i;

export function redactSensitiveValues(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redactSensitiveValues);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const redacted: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(record)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        redacted[key] = "[REDACTED]";
      } else {
        redacted[key] = redactSensitiveValues(nested);
      }
    }

    return redacted;
  }

  return value;
}

export function sanitizeAuditMetadata(
  metadata?: Record<string, unknown> | null,
): string | null {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  const redacted = redactSensitiveValues(metadata) as Record<string, unknown>;
  return stableJson(redacted);
}

export function getAuditActorFromUser(
  user: Pick<User, "id" | "name" | "email" | "role"> | null | undefined,
) {
  if (!user) {
    return {
      actorId: null,
      actorName: null,
      actorEmail: null,
      actorRole: null,
    };
  }

  return {
    actorId: user.id,
    actorName: user.name,
    actorEmail: user.email,
    actorRole: user.role,
  };
}

export async function recordAuditEvent(input: RecordAuditEventInput) {
  const latest = await prisma.auditLog.findFirst({
    orderBy: { sequence: "desc" },
    select: { sequence: true, auditHash: true },
  });

  const sequence = latest ? latest.sequence + 1 : 1;
  const previousAuditHash = latest?.auditHash ?? GENESIS_AUDIT_HASH;
  const timestamp = input.timestamp ?? new Date();
  const metadataJson = sanitizeAuditMetadata(input.metadata ?? null);

  const hashPayload = buildAuditHashPayload({
    sequence,
    timestamp,
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
    actorEmail: input.actorEmail ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    category: input.category,
    severity: input.severity,
    outcome: input.outcome,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    targetLabel: input.targetLabel ?? null,
    route: input.route ?? null,
    method: input.method ?? null,
    permission: input.permission ?? null,
    summary: input.summary,
    metadataJson,
    previousAuditHash,
  });

  const auditHash = computeAuditHash(hashPayload);

  return prisma.auditLog.create({
    data: {
      sequence,
      timestamp,
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      actorEmail: input.actorEmail ?? null,
      actorRole: input.actorRole ?? null,
      action: input.action,
      category: input.category,
      severity: input.severity,
      outcome: input.outcome,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      targetLabel: input.targetLabel ?? null,
      route: input.route ?? null,
      method: input.method ?? null,
      permission: input.permission ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      summary: input.summary,
      metadataJson,
      previousAuditHash,
      auditHash,
    },
  });
}

export async function recordAuditEventSafe(input: RecordAuditEventInput) {
  try {
    return await recordAuditEvent(input);
  } catch (error) {
    console.error(
      "Audit log write failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return null;
  }
}
