-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sequence" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "route" TEXT,
    "method" TEXT,
    "permission" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "summary" TEXT NOT NULL,
    "metadataJson" TEXT,
    "previousAuditHash" TEXT NOT NULL,
    "auditHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_sequence_key" ON "AuditLog"("sequence");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- CreateIndex
CREATE INDEX "AuditLog_outcome_idx" ON "AuditLog"("outcome");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_auditHash_idx" ON "AuditLog"("auditHash");

-- CreateIndex
CREATE INDEX "AuditLog_previousAuditHash_idx" ON "AuditLog"("previousAuditHash");
