import { Tier } from '@prisma/client';
import { config } from '../config/index.js';

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate upload request
 */
export function validateUpload(req, res, next) {
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    const metadata = req.body;

    // Validate required fields
    if (!metadata.originalFilename) {
      throw new ValidationError('originalFilename is required');
    }

    if (!metadata.salt || !metadata.iv) {
      throw new ValidationError(
        'Cryptographic parameters (salt, iv) are required'
      );
    }

    // Validate tier
    const tier = metadata.tier?.toUpperCase();
    if (!tier || !Object.values(Tier).includes(tier)) {
      throw new ValidationError('Invalid tier. Must be FREE or PRO');
    }

    // Validate file size against tier limits
    const fileSize = req.file.size;
    const maxSize = config.limits[tier].maxFileSize;

    if (fileSize > maxSize) {
      throw new ValidationError(
        `File size ${formatBytes(fileSize)} exceeds ${tier} tier limit of ${formatBytes(maxSize)}`
      );
    }

    // Validate maxDownloads
    const maxDownloads = parseInt(metadata.maxDownloads, 10);
    if (isNaN(maxDownloads) || maxDownloads < 0) {
      throw new ValidationError('maxDownloads must be a non-negative number');
    }

    if (tier === Tier.FREE && maxDownloads !== 1) {
      throw new ValidationError('FREE tier only supports maxDownloads = 1');
    }

    // Validate expiration
    if (metadata.expiresInHours) {
      const hours = parseInt(metadata.expiresInHours, 10);
      const maxHours = config.limits[tier].maxExpirationHours;

      if (isNaN(hours) || hours <= 0) {
        throw new ValidationError('expiresInHours must be a positive number');
      }

      if (hours > maxHours) {
        throw new ValidationError(
          `Expiration ${hours}h exceeds ${tier} tier limit of ${maxHours}h`
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  );
}
