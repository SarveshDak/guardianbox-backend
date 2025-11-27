import { PrismaClient, FileStatus } from '@prisma/client';
import { storageService } from './storageService.js';
import { config } from '../config/index.js';

const prisma = new PrismaClient();

export class FileShareService {
  /**
   * Create a new file share
   */
  async createFileShare(fileBuffer, metadata) {
    let expiresAt;

    if (metadata.expiresAt) {
      expiresAt = new Date(metadata.expiresAt);
    } else if (metadata.expiresInHours) {
      expiresAt = new Date(Date.now() + metadata.expiresInHours * 60 * 60 * 1000);
    } else {
      const maxHours = config.limits[metadata.tier].maxExpirationHours;
      expiresAt = new Date(Date.now() + maxHours * 60 * 60 * 1000);
    }

    const maxExpirationMs =
      config.limits[metadata.tier].maxExpirationHours * 60 * 60 * 1000;

    if (expiresAt - Date.now() > maxExpirationMs) {
      throw new Error(
        `Expiration exceeds tier limit of ${config.limits[metadata.tier].maxExpirationHours} hours`
      );
    }

    const fileShare = await prisma.fileShare.create({
      data: {
        originalFilename: metadata.originalFilename,
        size: BigInt(metadata.size),
        tier: metadata.tier,
        expiresAt,
        maxDownloads:
          metadata.maxDownloads === 0 ? null : metadata.maxDownloads,
        salt: metadata.salt,
        iv: metadata.iv,
        ownerUserId: metadata.ownerUserId,
        storageKey: '',
        status: FileStatus.ACTIVE,
      },
    });

    const { storageKey } = await storageService.saveEncryptedFile(
      fileBuffer,
      fileShare.id
    );

    await prisma.fileShare.update({
      where: { id: fileShare.id },
      data: { storageKey },
    });

    return {
      id: fileShare.id,
      downloadUrlBase: `${config.baseUrl}/api/files/${fileShare.id}/download`,
      metadata: {
        expiresAt: fileShare.expiresAt.toISOString(),
        maxDownloads: fileShare.maxDownloads,
        tier: fileShare.tier,
      },
    };
  }

  /**
   * Get metadata for one file
   */
  async getFileMetadata(id) {
    const fileShare = await prisma.fileShare.findUnique({
      where: { id },
    });

    if (!fileShare) throw new Error('File not found');

    const now = new Date();
    let status = fileShare.status;

    // Expired
    if (fileShare.expiresAt < now) {
      status = FileStatus.EXPIRED;
      await this.markAsExpired(id);
    }

    // Limit reached
    else if (
      fileShare.maxDownloads !== null &&
      fileShare.downloadCount >= fileShare.maxDownloads
    ) {
      status = FileStatus.LIMIT_REACHED;
      await this.markAsLimitReached(id);
    }

    const remainingDownloads =
      fileShare.maxDownloads === null
        ? -1
        : Math.max(0, fileShare.maxDownloads - fileShare.downloadCount);

    return {
      id: fileShare.id,
      originalFilename: fileShare.originalFilename,
      size: Number(fileShare.size),
      expiresAt: fileShare.expiresAt.toISOString(),
      remainingDownloads,
      maxDownloads: fileShare.maxDownloads,
      tier: fileShare.tier,
      status,
      salt: fileShare.salt,
      iv: fileShare.iv,
    };
  }

  /**
   * -------------------------------------------------------
   * DOWNLOAD FILE (UPDATED WITH AUTO DELETE ON LIMIT)
   * -------------------------------------------------------
   */
  async downloadFile(id) {
    const fileShare = await prisma.fileShare.findUnique({
      where: { id },
    });

    if (!fileShare) throw new Error("File not found");

    const now = new Date();

    // 1️⃣ AUTO DELETE EXPIRED FILE
    if (fileShare.expiresAt < now) {
      await this.deleteFileShare(id);
      throw new Error("File expired");
    }

    // 2️⃣ AUTO DELETE IF LIMIT ALREADY REACHED
    if (
      fileShare.maxDownloads !== null &&
      fileShare.downloadCount >= fileShare.maxDownloads
    ) {
      await this.deleteFileShare(id);
      throw new Error("Download limit reached");
    }

    // 3️⃣ READ FILE
    const buffer = await storageService.readEncryptedFile(fileShare.storageKey);

    // 4️⃣ INCREMENT DOWNLOAD COUNT
    const updated = await prisma.fileShare.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    // 5️⃣ AUTO DELETE IF LIMIT NOW REACHED
    if (
      updated.maxDownloads !== null &&
      updated.downloadCount >= updated.maxDownloads
    ) {
      await this.markAsLimitReached(id);
      await this.deleteFileShare(id);
    }

    return {
      buffer,
      filename: fileShare.originalFilename,
    };
  }

  /**
   * Delete file (used by download, cleanup, UI delete)
   */
  async deleteFileShare(id) {
    const fileShare = await prisma.fileShare.findUnique({ where: { id } });
    if (!fileShare) return;

    await storageService.deleteEncryptedFile(fileShare.storageKey);
    await prisma.fileShare.delete({ where: { id } });
  }

  async markAsExpired(id) {
    await prisma.fileShare.update({
      where: { id },
      data: { status: FileStatus.EXPIRED },
    });
  }

  async markAsLimitReached(id) {
    await prisma.fileShare.update({
      where: { id },
      data: { status: FileStatus.LIMIT_REACHED },
    });
  }

  /**
   * Auto delete expired & limit reached files
   */
  async cleanupExpiredFiles() {
    const now = new Date();

    const expiredFiles = await prisma.fileShare.findMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          {
            AND: [
              { maxDownloads: { not: null } },
              {
                downloadCount: {
                  gte: prisma.fileShare.fields.maxDownloads,
                },
              },
            ],
          },
        ],
      },
    });

    let deletedCount = 0;

    for (const file of expiredFiles) {
      try {
        await this.deleteFileShare(file.id);
        deletedCount++;
      } catch (err) {
        console.error("Failed to delete expired file:", file.id, err);
      }
    }

    return deletedCount;
  }

  /**
   * List all files for dashboard
   */
  async getAllFileShares() {
    const files = await prisma.fileShare.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return files.map((file) => ({
      id: file.id,
      originalFilename: file.originalFilename,
      size: Number(file.size),
      expiresAt: file.expiresAt.toISOString(),
      maxDownloads: file.maxDownloads,
      downloadsUsed: file.downloadCount,
      status: file.status,
      tier: file.tier,
    }));
  }
}

export const fileShareService = new FileShareService();
