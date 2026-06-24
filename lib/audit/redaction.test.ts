import { describe, expect, it } from "vitest";
import {
  redactSensitiveValues,
  sanitizeAuditMetadata,
} from "@/lib/audit/log";

describe("audit redaction", () => {
  it("redacts password fields", () => {
    const result = redactSensitiveValues({
      password: "secret",
      email: "user@example.com",
    }) as Record<string, unknown>;
    expect(result.password).toBe("[REDACTED]");
    expect(result.email).toBe("user@example.com");
  });

  it("redacts signingPrivateKey", () => {
    const result = redactSensitiveValues({
      signingPrivateKey: "pem-content",
    }) as Record<string, unknown>;
    expect(result.signingPrivateKey).toBe("[REDACTED]");
  });

  it("redacts token, session, and secret fields", () => {
    const result = redactSensitiveValues({
      token: "abc",
      session: "sess",
      authorization: "Bearer x",
      secret: "hidden",
      cookie: "sid=1",
    }) as Record<string, unknown>;

    expect(result.token).toBe("[REDACTED]");
    expect(result.session).toBe("[REDACTED]");
    expect(result.authorization).toBe("[REDACTED]");
    expect(result.secret).toBe("[REDACTED]");
    expect(result.cookie).toBe("[REDACTED]");
  });

  it("keeps safe metadata values", () => {
    const json = sanitizeAuditMetadata({
      caseId: "case-1",
      evidenceCount: 3,
      matched: true,
    });
    expect(json).toContain("case-1");
    expect(json).not.toContain("[REDACTED]");
  });
});
