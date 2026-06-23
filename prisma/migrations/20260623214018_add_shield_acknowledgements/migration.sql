-- CreateTable
CREATE TABLE "ShieldAlertAcknowledgement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertId" TEXT NOT NULL,
    "alertTitle" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reference" TEXT,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "acknowledgedById" TEXT NOT NULL,
    "acknowledgedByName" TEXT NOT NULL,
    "acknowledgedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShieldEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "alertId" TEXT,
    "severity" TEXT,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ShieldAlertAcknowledgement_alertId_key" ON "ShieldAlertAcknowledgement"("alertId");
