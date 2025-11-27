// types.js

import { Tier, FileStatus } from '@prisma/client';

export { Tier, FileStatus };

/**
 * @typedef {Object} UploadMetadata
 * @property {string} originalFilename
 * @property {number} size
 * @property {import('@prisma/client').Tier} tier
 * @property {number} [expiresInHours]
 * @property {string} [expiresAt]
 * @property {number} maxDownloads
 * @property {string} salt
 * @property {string} iv
 * @property {string} [ownerUserId]
 */

/**
 * @typedef {Object} FileShareResponseMetadata
 * @property {string} expiresAt
 * @property {number|null} maxDownloads
 * @property {import('@prisma/client').Tier} tier
 */

/**
 * @typedef {Object} FileShareResponse
 * @property {string} id
 * @property {string} downloadUrlBase
 * @property {FileShareResponseMetadata} metadata
 */

/**
 * @typedef {Object} FileMetadataResponse
 * @property {string} id
 * @property {string} originalFilename
 * @property {number} size
 * @property {string} expiresAt
 * @property {number} remainingDownloads
 * @property {number|null} maxDownloads
 * @property {import('@prisma/client').Tier} tier
 * @property {import('@prisma/client').FileStatus} status
 * @property {string} salt
 * @property {string} iv
 */

/**
 * @typedef {Object} StorageService
 * @property {(buffer: Buffer, id: string) => Promise<{ storageKey: string }>} saveEncryptedFile
 * @property {(storageKey: string) => Promise<Buffer|null>} readEncryptedFile
 * @property {(storageKey: string) => Promise<void>} deleteEncryptedFile
 */
