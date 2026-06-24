import { describe, expect, it } from "vitest";
import {
  buildAuditHashPayload,
  canonicalizeAuditPayload,
  computeAuditHash,
} from "@/lib/audit/hash";
import { GENESIS_AUDIT_HASH } from "@/lib/audit/types";

const baseInput = {
  sequence: 1,
  timestamp: new Date("2026-06-23T12:00:00.000Z"),
  actorId: "user-1",
  actorName: "Test User",
  actorEmail: "test@example.com",
  actorRole: "ADMIN",
  action: "USER_LOGGED_IN",
  category: "AUTH",
  severity: "NOTICE",
  outcome: "SUCCESS",
  targetType: "User",
  targetId: "user-1",
  targetLabel: "Test User",
  route: "/login",
  method: "POST",
  permission: null,
  summary: "User logged in",
  metadataJson: null,
  previousAuditHash: GENESIS_AUDIT_HASH,
};

describe("audit hash", () => {
  it("produces the same hash for the same payload", () => {
    const payload = buildAuditHashPayload(baseInput);
    const hashA = computeAuditHash(payload);
    const hashB = computeAuditHash(payload);
    expect(hashA).toBe(hashB);
  });

  it("changes hash when summary changes", () => {
    const payloadA = buildAuditHashPayload(baseInput);
    const payloadB = buildAuditHashPayload({
      ...baseInput,
      summary: "Different summary",
    });
    expect(computeAuditHash(payloadA)).not.toBe(computeAuditHash(payloadB));
  });

  it("changes hash when previousAuditHash changes", () => {
    const payloadA = buildAuditHashPayload(baseInput);
    const payloadB = buildAuditHashPayload({
      ...baseInput,
      sequence: 2,
      previousAuditHash: "abc123",
    });
    expect(computeAuditHash(payloadA)).not.toBe(computeAuditHash(payloadB));
  });

  it("keeps canonical output stable regardless of metadata key order", () => {
    const metadataA = canonicalizeAuditPayload({
      ...buildAuditHashPayload({
        ...baseInput,
        metadataJson: JSON.stringify({ b: 2, a: 1 }),
      }),
    });
    const metadataB = canonicalizeAuditPayload({
      ...buildAuditHashPayload({
        ...baseInput,
        metadataJson: JSON.stringify({ a: 1, b: 2 }),
      }),
    });
    expect(metadataA).toBe(metadataB);
  });
});
