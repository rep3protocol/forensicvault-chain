import { describe, expect, it } from "vitest";
import {
  verifyBackupManifestIntegrity,
} from "@/lib/backup/verify";
import { BACKUP_PACKAGE_VERSION, type BackupManifest } from "@/lib/backup/types";

const baseManifest: BackupManifest = {
  packageVersion: BACKUP_PACKAGE_VERSION,
  appName: "ForensicVault Chain",
  appVersionTag: "v0.1.8-backup-restore-diagnostics",
  environment: "LOCAL_TESTNET",
  warning: "LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.",
  sensitiveDataWarning: "Sensitive local data warning.",
  generatedAt: new Date().toISOString(),
  generatedBy: {
    userId: "u1",
    name: "Admin",
    email: "admin@example.com",
    role: "ADMIN",
  },
  source: {
    databaseProvider: "sqlite",
    databasePathLabel: "dev.db",
    storagePathLabel: "storage/evidence",
  },
  counts: {
    users: 1,
    cases: 0,
    evidenceItems: 0,
    custodyEvents: 0,
    ledgerBlocks: 0,
    ledgerTransactions: 0,
    verifications: 0,
    anchorRecords: 0,
    shieldAcknowledgements: 0,
    shieldEvents: 0,
    auditLogs: 0,
    wallets: 1,
    tokenTransactions: 0,
  },
  integrity: {
    ledgerValid: true,
    ledgerLatestHeight: null,
    ledgerLatestHash: null,
    auditValid: true,
    auditLatestSequence: null,
    auditLatestHash: null,
    latestAnchorHeight: null,
    latestAnchorHash: null,
    latestAnchorLedgerRoot: null,
  },
  files: {
    database: {
      name: "database/vault.sqlite",
      sizeBytes: 1,
      sha256: "abc",
    },
    evidenceFiles: [],
  },
  package: {
    manifestSha256: "manifest-hash",
    createdWith: "test",
    notes: null,
  },
};

describe("verifyBackupManifestIntegrity", () => {
  it("returns no errors for a valid manifest", () => {
    expect(verifyBackupManifestIntegrity(baseManifest)).toEqual([]);
  });

  it("flags unsupported package version", () => {
    const errors = verifyBackupManifestIntegrity({
      ...baseManifest,
      packageVersion: "FV_BACKUP_V0" as typeof BACKUP_PACKAGE_VERSION,
    });
    expect(errors.some((error) => error.includes("package version"))).toBe(true);
  });

  it("flags missing generatedAt", () => {
    const errors = verifyBackupManifestIntegrity({
      ...baseManifest,
      generatedAt: "",
    });
    expect(errors.some((error) => error.includes("generatedAt"))).toBe(true);
  });
});
