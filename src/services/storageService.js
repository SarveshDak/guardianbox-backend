import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';

/**
 * Local filesystem storage implementation
 */
class LocalStorageService {
  constructor(storageRoot) {
    this.storageRoot = storageRoot;
    this.ensureStorageDirectory();
  }

  async ensureStorageDirectory() {
    try {
      await fs.mkdir(this.storageRoot, { recursive: true });
    } catch (error) {
      console.error('Failed to create storage directory:', error);
    }
  }

  async saveEncryptedFile(buffer, id) {
    const storageKey = `${id}.enc`;
    const filePath = path.join(this.storageRoot, storageKey);

    await fs.writeFile(filePath, buffer);

    return { storageKey };
  }

  async readEncryptedFile(storageKey) {
    try {
      const filePath = path.join(this.storageRoot, storageKey);
      return await fs.readFile(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async deleteEncryptedFile(storageKey) {
    try {
      const filePath = path.join(this.storageRoot, storageKey);
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File already deleted, ignore
        return;
      }
      throw error;
    }
  }
}

/**
 * S3-compatible storage implementation (placeholder)
 * In production, use AWS SDK or compatible S3 client
 */
class S3StorageService {
  async saveEncryptedFile(buffer, id) {
    // TODO: Implement S3 upload
    // const s3 = new S3Client({ region: config.s3.region });
    // const storageKey = `encrypted-files/${id}.enc`;
    // await s3.send(new PutObjectCommand({
    //   Bucket: config.s3.bucket,
    //   Key: storageKey,
    //   Body: buffer,
    // }));
    throw new Error('S3 storage not implemented');
  }

  async readEncryptedFile(storageKey) {
    // TODO: Implement S3 download
    throw new Error('S3 storage not implemented');
  }

  async deleteEncryptedFile(storageKey) {
    // TODO: Implement S3 delete
    throw new Error('S3 storage not implemented');
  }
}

/**
 * Factory function to get the appropriate storage service
 */
export function getStorageService() {
  if (config.storageType === 's3') {
    return new S3StorageService();
  }
  return new LocalStorageService(config.storageRoot);
}

export const storageService = getStorageService();
