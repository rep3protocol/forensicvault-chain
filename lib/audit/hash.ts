import { sha256String, stableJson } from "@/lib/crypto/hash";

export type AuditHashPayload = {
  sequence: number;
  timestamp: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  category: string;
  severity: string;
  outcome: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  route: string | null;
  method: string | null;
  permission: string | null;
  summary: string;
  metadataJson: string | null;
  previousAuditHash: string;
};

export function canonicalizeAuditPayload(input: AuditHashPayload): string {
  return stableJson(input);
}

export function buildAuditHashPayload(input: {
  sequence: number;
  timestamp: Date;
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  category: string;
  severity: string;
  outcome: string;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  route?: string | null;
  method?: string | null;
  permission?: string | null;
  summary: string;
  metadataJson?: string | null;
  previousAuditHash: string;
}): AuditHashPayload {
  let metadataJson = input.metadataJson ?? null;
  if (metadataJson) {
    try {
      metadataJson = stableJson(JSON.parse(metadataJson) as Record<string, unknown>);
    } catch {
      // Keep original string when metadata is not valid JSON.
    }
  }

  return {
    sequence: input.sequence,
    timestamp: input.timestamp.toISOString(),
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
    previousAuditHash: input.previousAuditHash,
  };
}

export function computeAuditHash(input: AuditHashPayload): string {
  return sha256String(canonicalizeAuditPayload(input));
}
