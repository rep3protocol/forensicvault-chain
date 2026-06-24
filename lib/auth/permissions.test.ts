import { describe, expect, it } from "vitest";
import { can } from "@/lib/auth/permissions";

describe("audit permissions", () => {
  it("allows ADMIN to view audit log", () => {
    expect(can("ADMIN", "VIEW_AUDIT_LOG")).toBe(true);
    expect(can("ADMIN", "EXPORT_AUDIT_LOG")).toBe(true);
    expect(can("ADMIN", "VALIDATE_AUDIT_LOG")).toBe(true);
  });

  it("allows SUPERVISOR to view audit log", () => {
    expect(can("SUPERVISOR", "VIEW_AUDIT_LOG")).toBe(true);
    expect(can("SUPERVISOR", "EXPORT_AUDIT_LOG")).toBe(true);
  });

  it("blocks VIEWER from audit log", () => {
    expect(can("VIEWER", "VIEW_AUDIT_LOG")).toBe(false);
    expect(can("VIEWER", "EXPORT_AUDIT_LOG")).toBe(false);
  });

  it("blocks INVESTIGATOR from managing users", () => {
    expect(can("INVESTIGATOR", "MANAGE_USERS")).toBe(false);
    expect(can("INVESTIGATOR", "VIEW_AUDIT_LOG")).toBe(false);
    expect(can("INVESTIGATOR", "VIEW_BACKUPS")).toBe(false);
  });

  it("allows SUPERVISOR backup access but not restore", () => {
    expect(can("SUPERVISOR", "VIEW_BACKUPS")).toBe(true);
    expect(can("SUPERVISOR", "CREATE_BACKUP")).toBe(true);
    expect(can("SUPERVISOR", "RESTORE_BACKUP")).toBe(false);
  });

  it("allows ADMIN backup and restore permissions", () => {
    expect(can("ADMIN", "RESTORE_BACKUP")).toBe(true);
    expect(can("ADMIN", "RUN_DEV_DIAGNOSTICS")).toBe(true);
  });
});
