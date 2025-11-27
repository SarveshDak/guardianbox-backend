-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'LIMIT_REACHED');

-- CreateTable
CREATE TABLE "FileShare" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxDownloads" INTEGER,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "status" "FileStatus" NOT NULL DEFAULT 'ACTIVE',
    "salt" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileShare_storageKey_key" ON "FileShare"("storageKey");

-- CreateIndex
CREATE INDEX "FileShare_expiresAt_idx" ON "FileShare"("expiresAt");

-- CreateIndex
CREATE INDEX "FileShare_status_idx" ON "FileShare"("status");

-- CreateIndex
CREATE INDEX "FileShare_ownerUserId_idx" ON "FileShare"("ownerUserId");
