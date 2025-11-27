import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const qrTokenService = {
  /**
   * Create a one-time / time-limited token for a file
   * @param {string} fileId
   * @param {number} ttlSeconds
   * @returns {token string}
   */
  async createToken(fileId, ttlSeconds = 300) { // default 5 minutes
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await prisma.qRToken.create({
      data: {
        token,
        fileId,
        expiresAt,
      },
    });

    return token;
  },

  /**
   * Validate token (exists and not expired). Returns record or null.
   * Does NOT delete it automatically (download route will delete for single-use).
   */
  async getValidToken(token) {
    const record = await prisma.qRToken.findUnique({ where: { token } });
    if (!record) return null;
    if (record.expiresAt < new Date()) {
      // remove expired token
      await prisma.qRToken.delete({ where: { token } }).catch(() => {});
      return null;
    }
    return record;
  },

  /**
   * Delete token (used for single-use)
   */
  async deleteToken(token) {
    await prisma.qRToken.delete({ where: { token } }).catch(() => {});
  },
};
