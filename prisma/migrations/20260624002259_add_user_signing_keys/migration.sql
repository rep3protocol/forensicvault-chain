-- AlterTable
ALTER TABLE "User" ADD COLUMN "signingKeyCreatedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "signingKeyFingerprint" TEXT;
ALTER TABLE "User" ADD COLUMN "signingPrivateKey" TEXT;
ALTER TABLE "User" ADD COLUMN "signingPublicKey" TEXT;
