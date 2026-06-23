export type ShieldSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type ShieldStatus = "CLEAR" | "WATCH" | "RISK" | "CRITICAL";

export type ShieldAlertCategory =
  | "evidence"
  | "custody"
  | "ledger"
  | "duplicates"
  | "storage"
  | "anchors";

export type ShieldAlert = {
  id: string;
  severity: ShieldSeverity;
  category: ShieldAlertCategory;
  title: string;
  description: string;
  reference?: string;
  reason: string;
  action: string;
};

export type ShieldDuplicateGroup = {
  sha256Hash: string;
  itemCount: number;
  caseCount: number;
  caseTitles: string[];
  evidenceNames: string[];
};

export type ShieldMetrics = {
  ledgerValid: boolean;
  latestBlockHeight: number | null;
  latestBlockHash: string | null;
  totalLedgerBlocks: number;
  totalEvidenceItems: number;
  totalCases: number;
  totalCustodyEvents: number;
  totalVerifications: number;
  failedVerifications: number;
  evidenceWithoutVerification: number;
  duplicateHashGroups: number;
  crossCaseDuplicateHashGroups: number;
  missingEvidenceRegistrationReferences: number;
  custodyEventsWithMissingNotes: number;
  custodyEventsWithMissingHashReferences: number;
  tamperBackupFileCount: number;
};

export type ShieldScanResult = {
  generatedAt: Date;
  status: ShieldStatus;
  metrics: ShieldMetrics;
  alerts: ShieldAlert[];
  duplicateGroups: ShieldDuplicateGroup[];
  ledgerErrors: string[];
  recommendedActions: string[];
};
