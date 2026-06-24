import { access } from "node:fs/promises";
import path from "node:path";
import type { User } from "@prisma/client";
import { validateAuditLogChain } from "@/lib/audit/validation";
import { sha256File, getFileSize } from "@/lib/backup/hash";
import {
  BACKUP_PACKAGE_VERSION,
  type BackupManifest,
} from "@/lib/backup/types";
import {
  getDatabasePath,
  getDatabasePathLabel,
  getEvidenceStorageDirectory,
  getProjectRoot,
} from "@/lib/backup/paths";
import { stableJson, sha256String } from "@/lib/crypto/hash";
import { validateLedgerChain } from "@/lib/ledgerValidation";
import { prisma } from "@/lib/prisma";

export async function getVaultCounts() {
  const [
    users,
    cases,
    evidenceItems,
    custodyEvents,
    ledgerBlocks,
    ledgerTransactions,
    verifications,
    anchorRecords,
    shieldAcknowledgements,
    shieldEvents,
    auditLogs,
    wallets,
    tokenTransactions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.case.count(),
    prisma.evidenceItem.count(),
    prisma.custodyEvent.count(),
    prisma.ledgerBlock.count(),
    prisma.ledgerTransaction.count(),
    prisma.verification.count(),
    prisma.anchorRecord.count(),
    prisma.shieldAlertAcknowledgement.count(),
    prisma.shieldEvent.count(),
    prisma.auditLog.count(),
    prisma.wallet.count(),
    prisma.tokenTransaction.count(),
  ]);

  return {
    users,
    cases,
    evidenceItems,
    custodyEvents,
    ledgerBlocks,
    ledgerTransactions,
    verifications,
    anchorRecords,
    shieldAcknowledgements,
    shieldEvents,
    auditLogs,
    wallets,
    tokenTransactions,
  };
}

export async function getEvidenceFileInventory() {
  const evidenceItems = await prisma.evidenceItem.findMany({
    select: {
      id: true,
      originalName: true,
      sha256Hash: true,
      storedPath: true,
      sizeBytes: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const projectRoot = getProjectRoot();
  const inventory = [];

  for (const item of evidenceItems) {
    if (!item.storedPath) {
      inventory.push({
        relativePath: `evidence/${item.id}`,
        originalName: item.originalName,
        evidenceId: item.id,
        sha256: item.sha256Hash,
        sizeBytes: item.sizeBytes ?? 0,
        exists: false,
        zipPath: `evidence/${item.id}`,
      });
      continue;
    }

    const absolutePath = path.join(projectRoot, item.storedPath);
    const zipPath = item.storedPath.replace(/^storage\//, "");
    let exists = false;
    let sizeBytes = item.sizeBytes ?? 0;
    let sha256 = item.sha256Hash;

    try {
      await access(absolutePath);
      exists = true;
      sizeBytes = await getFileSize(absolutePath);
      sha256 = await sha256File(absolutePath);
    } catch {
      exists = false;
    }

    inventory.push({
      relativePath: zipPath,
      originalName: item.originalName,
      evidenceId: item.id,
      sha256,
      sizeBytes,
      exists,
      zipPath,
    });
  }

  return inventory;
}

export async function getBackupIntegritySummary() {
  const [ledgerValidation, auditValidation, latestBlock, latestAnchor] =
    await Promise.all([
      validateLedgerChain(),
      validateAuditLogChain(),
      prisma.ledgerBlock.findFirst({ orderBy: { height: "desc" } }),
      prisma.anchorRecord.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

  return {
    ledgerValid: ledgerValidation.valid,
    ledgerLatestHeight: latestBlock?.height ?? null,
    ledgerLatestHash: latestBlock?.blockHash ?? null,
    auditValid: auditValidation.valid,
    auditLatestSequence: auditValidation.latestSequence,
    auditLatestHash: auditValidation.latestAuditHash,
    latestAnchorHeight: latestAnchor?.latestBlockHeight ?? null,
    latestAnchorHash: latestAnchor?.latestBlockHash ?? null,
    latestAnchorLedgerRoot: latestAnchor?.ledgerRoot ?? null,
  };
}

export async function buildBackupManifest(
  user: Pick<User, "id" | "name" | "email" | "role">,
  options?: { note?: string | null },
) {
  const dbPath = getDatabasePath();
  const dbHash = await sha256File(dbPath);
  const dbSize = await getFileSize(dbPath);
  const [counts, integrity, evidenceInventory] = await Promise.all([
    getVaultCounts(),
    getBackupIntegritySummary(),
    getEvidenceFileInventory(),
  ]);

  const manifestWithoutPackageHash: Omit<BackupManifest, "package"> & {
    package: Omit<BackupManifest["package"], "manifestSha256">;
  } = {
    packageVersion: BACKUP_PACKAGE_VERSION,
    appName: "ForensicVault Chain",
    appVersionTag: "v0.1.8-backup-restore-diagnostics",
    environment: "LOCAL_TESTNET",
    warning: "LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.",
    sensitiveDataWarning:
      "This backup may contain sensitive local database data, including local MVP credential hashes and local signing key material. Store it securely.",
    generatedAt: new Date().toISOString(),
    generatedBy: {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    source: {
      databaseProvider: "sqlite",
      databasePathLabel: getDatabasePathLabel(),
      storagePathLabel: "storage/evidence",
    },
    counts,
    integrity,
    files: {
      database: {
        name: "database/vault.sqlite",
        sizeBytes: dbSize,
        sha256: dbHash,
      },
      evidenceFiles: evidenceInventory.map((item) => ({
        relativePath: item.zipPath,
        originalName: item.originalName,
        evidenceId: item.evidenceId,
        sha256: item.sha256,
        sizeBytes: item.sizeBytes,
        exists: item.exists,
      })),
    },
    package: {
      createdWith: "ForensicVault Chain backup service",
      notes: options?.note?.trim() || null,
    },
  };

  const manifestSha256 = stableJson({
    ...manifestWithoutPackageHash,
    package: {
      ...manifestWithoutPackageHash.package,
      manifestSha256: "",
    },
  });

  const manifest: BackupManifest = {
    ...manifestWithoutPackageHash,
    package: {
      ...manifestWithoutPackageHash.package,
      manifestSha256: sha256String(manifestSha256),
    },
  };

  return manifest;
}

export async function getCurrentVaultStatus() {
  const [counts, integrity, evidenceInventory] = await Promise.all([
    getVaultCounts(),
    getBackupIntegritySummary(),
    getEvidenceFileInventory(),
  ]);

  const missingEvidenceFiles = evidenceInventory.filter((item) => !item.exists)
    .length;

  return {
    counts,
    integrity,
    evidenceFileCount: evidenceInventory.length,
    missingEvidenceFiles,
  };
}
