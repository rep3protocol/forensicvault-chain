export type ShieldSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type ShieldStatus = "CLEAR" | "WATCH" | "RISK" | "CRITICAL";

export type ShieldAlertCategory =
  | "evidence"
  | "custody"
  | "ledger"
  | "duplicates"
  | "storage"
  | "anchors"
  | "cases"
  | "security";

export type ShieldAlert = {
  id: string;
  severity: ShieldSeverity;
  category: ShieldAlertCategory;
  title: string;
  description: string;
  reference?: string;
  reason: string;
  action: string;
  acknowledgement?: ShieldAlertAcknowledgementSummary;
};

export type ShieldAlertAcknowledgementSummary = {
  alertId: string;
  note: string | null;
  acknowledgedById: string;
  acknowledgedByName: string;
  acknowledgedAt: Date;
};

export type ShieldEventSummary = {
  id: string;
  eventType: string;
  alertId: string | null;
  severity: string | null;
  category: string | null;
  title: string;
  description: string;
  actorName: string | null;
  createdAt: Date;
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
  acknowledgedAlertCount: number;
  unacknowledgedCriticalAlerts: number;
  unacknowledgedHighAlerts: number;
  unacknowledgedMediumAlerts: number;
  unacknowledgedLowAlerts: number;
  savedAnchorCount: number;
  latestSavedAnchorHeight: number | null;
  latestAnchorMatchesCurrent: boolean;
  latestAnchorComparisonStatus: string;
  duplicateAnchorRecordGroups: number;
  caseReadinessWarningCount: number;
  signedCustodyEvents: number;
  verifiedCustodySignatures: number;
  failedCustodySignatures: number;
  missingCustodySignatures: number;
  totalUsers: number;
  adminCount: number;
  unrecognizedRoleCount: number;
  totalAuditEvents: number;
  auditChainValid: boolean;
  latestAuditSequence: number | null;
  latestAuditHash: string | null;
  recentDeniedAuditEvents: number;
  recentHighAuditEvents: number;
  recentCriticalAuditEvents: number;
  auditValidationErrorCount: number;
};

export type ShieldScanResult = {
  generatedAt: Date;
  status: ShieldStatus;
  rawStatus: ShieldStatus;
  metrics: ShieldMetrics;
  alerts: ShieldAlert[];
  acknowledgedAlerts: ShieldAlert[];
  unacknowledgedAlerts: ShieldAlert[];
  recentEvents: ShieldEventSummary[];
  duplicateGroups: ShieldDuplicateGroup[];
  ledgerErrors: string[];
  recommendedActions: string[];
};
