import { describe, expect, it } from "vitest";
import { can } from "@/lib/auth/permissions";
import { normalizeRole, resolveRole } from "@/lib/auth/roles";

describe("normalizeRole", () => {
  it("maps legacy Investigator values", () => {
    expect(normalizeRole("Investigator")).toBe("INVESTIGATOR");
    expect(normalizeRole("INVESTIGATOR")).toBe("INVESTIGATOR");
  });

  it("maps display labels and admin aliases", () => {
    expect(normalizeRole("Admin")).toBe("ADMIN");
    expect(normalizeRole("Evidence Custodian")).toBe("EVIDENCE_CUSTODIAN");
    expect(normalizeRole("Viewer")).toBe("VIEWER");
  });

  it("falls back safely for unknown values", () => {
    expect(normalizeRole("Mystery Role")).toBe("INVESTIGATOR");
    expect(resolveRole("Mystery Role").recognized).toBe(false);
  });
});

describe("can", () => {
  it("grants admin all permissions", () => {
    expect(can("ADMIN", "MANAGE_USERS")).toBe(true);
    expect(can("ADMIN", "USE_TAMPER_TEST")).toBe(true);
  });

  it("blocks viewer mutations", () => {
    expect(can("VIEWER", "VIEW_EVIDENCE")).toBe(true);
    expect(can("VIEWER", "UPLOAD_EVIDENCE")).toBe(false);
    expect(can("VIEWER", "ACKNOWLEDGE_SHIELD_ALERT")).toBe(false);
  });

  it("allows investigator custody and blocks tamper test", () => {
    expect(can("INVESTIGATOR", "ADD_CUSTODY_EVENT")).toBe(true);
    expect(can("INVESTIGATOR", "ACKNOWLEDGE_SHIELD_ALERT")).toBe(true);
    expect(can("INVESTIGATOR", "CLEAR_SHIELD_ACKNOWLEDGEMENT")).toBe(false);
    expect(can("INVESTIGATOR", "USE_TAMPER_TEST")).toBe(false);
  });

  it("allows supervisor clear acknowledgement", () => {
    expect(can("SUPERVISOR", "CLEAR_SHIELD_ACKNOWLEDGEMENT")).toBe(true);
    expect(can("SUPERVISOR", "MANAGE_USERS")).toBe(false);
  });
});
