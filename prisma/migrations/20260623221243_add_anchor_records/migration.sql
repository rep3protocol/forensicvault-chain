-- CreateTable
CREATE TABLE "AnchorRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT,
    "chainId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "latestBlockHeight" INTEGER NOT NULL,
    "latestBlockHash" TEXT NOT NULL,
    "ledgerRoot" TEXT NOT NULL,
    "totalLedgerBlocks" INTEGER NOT NULL,
    "evidenceCount" INTEGER NOT NULL,
    "custodyEventCount" INTEGER NOT NULL,
    "verificationCount" INTEGER NOT NULL,
    "caseCount" INTEGER NOT NULL,
    "duplicateHashGroupCount" INTEGER NOT NULL,
    "exportedJson" TEXT NOT NULL,
    "publishedUrl" TEXT,
    "publicationNotes" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
