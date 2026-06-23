-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "publicKey" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Wallet" ("address", "balance", "createdAt", "id", "label", "publicKey", "updatedAt") SELECT "address", "balance", "createdAt", "id", "label", "publicKey", "updatedAt" FROM "Wallet";
DROP TABLE "Wallet";
ALTER TABLE "new_Wallet" RENAME TO "Wallet";
CREATE UNIQUE INDEX "Wallet_address_key" ON "Wallet"("address");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
