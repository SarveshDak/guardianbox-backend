/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `FileShare` table. All the data in the column will be lost.
  - Changed the type of `tier` on the `FileShare` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "FileShare_expiresAt_idx";

-- DropIndex
DROP INDEX "FileShare_ownerUserId_idx";

-- DropIndex
DROP INDEX "FileShare_status_idx";

-- DropIndex
DROP INDEX "FileShare_storageKey_key";

-- AlterTable
ALTER TABLE "FileShare" DROP COLUMN "updatedAt",
DROP COLUMN "tier",
ADD COLUMN     "tier" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "QRToken" (
    "token" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QRToken_pkey" PRIMARY KEY ("token")
);

-- AddForeignKey
ALTER TABLE "QRToken" ADD CONSTRAINT "QRToken_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
