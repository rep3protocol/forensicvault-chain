export const BACKUP_PACKAGE_VERSION = "FV_BACKUP_V1" as const;

export type BackupPackageVersion = typeof BACKUP_PACKAGE_VERSION;

export type BackupManifest = {
  packageVersion: BackupPackageVersion;
  appName: string;
  appVersionTag: string;
  environment: string;
  warning: string;
  sensitiveDataWarning: string;
  generatedAt: string;
  generatedBy: {
    userId: string;
    name: string;
    email: string | null;
    role: string;
  };
  source: {
    databaseProvider: string;
    databasePathLabel: string;
    storagePathLabel: string;
  };
  counts: {
    users: number;
    cases: number;
    evidenceItems: number;
    custodyEvents: number;
    ledgerBlocks: number;
    ledgerTransactions: number;
    verifications: number;
    anchorRecords: number;
    shieldAcknowledgements: number;
    shieldEvents: number;
    auditLogs: number;
    wallets: number;
    tokenTransactions: number;
  };
  integrity: {
    ledgerValid: boolean;
    ledgerLatestHeight: number | null;
    ledgerLatestHash: string | null;
    auditValid: boolean;
    auditLatestSequence: number | null;
    auditLatestHash: string | null;
    latestAnchorHeight: number | null;
    latestAnchorHash: string | null;
    latestAnchorLedgerRoot: string | null;
  };
  files: {
    database: {
      name: string;
      sizeBytes: number;
      sha256: string;
    };
    evidenceFiles: {
      relativePath: string;
      originalName: string;
      evidenceId: string;
      sha256: string;
      sizeBytes: number;
      exists: boolean;
    }[];
  };
  package: {
    manifestSha256: string;
    createdWith: string;
    notes: string | null;
  };
};

export type BackupVerificationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest: BackupManifest | null;
  databaseFilePresent: boolean;
  databaseHashMatched: boolean;
  evidenceFilesChecked: number;
  evidenceFilesMissing: number;
  evidenceFilesHashMismatched: number;
  auditChainValidAtBackup: boolean;
  ledgerValidAtBackup: boolean;
};

export type RestorePreviewResult = {
  validBackup: boolean;
  restoreAllowed: boolean;
  warnings: string[];
  errors: string[];
  currentVaultCounts: BackupManifest["counts"] | null;
  incomingVaultCounts: BackupManifest["counts"] | null;
  currentLedgerLatestHash: string | null;
  incomingLedgerLatestHash: string | null;
  currentAuditLatestHash: string | null;
  incomingAuditLatestHash: string | null;
  destructiveImpactSummary: string;
  manifest: BackupManifest | null;
};

export const BACKUP_ACTIONS = {
  BACKUP_CREATED: "BACKUP_CREATED",
  BACKUP_DOWNLOADED: "BACKUP_DOWNLOADED",
  BACKUP_VERIFIED: "BACKUP_VERIFIED",
  RESTORE_PREVIEWED: "RESTORE_PREVIEWED",
  RESTORE_EXECUTED: "RESTORE_EXECUTED",
  RESTORE_BLOCKED: "RESTORE_BLOCKED",
} as const;

export type BackupPackageInfo = {
  filename: string;
  sizeBytes: number;
  createdAt: Date;
  sha256: string | null;
  manifestGeneratedAt: string | null;
};

export type RestoreMarker = {
  restoredAt: string;
  restoredBy: {
    userId: string;
    name: string;
    email: string | null;
  };
  backupFilename: string;
  backupSha256: string;
  preRestoreBackupFilename: string;
  warning: string;
};
