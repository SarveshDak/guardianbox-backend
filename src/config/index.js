import dotenv from 'dotenv';
import { Tier } from '../types/index.js';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/guardianbox',
  
  // Storage
  storageType: process.env.STORAGE_TYPE || 'local', // 'local' or 's3'
  storageRoot: process.env.STORAGE_ROOT || './uploads',
  
  // S3 Config (if using S3)
  s3: {
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  
  // CORS - FIXED TO ALLOW YOUR NETLIFY DEPLOYMENT
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3000',
    'https://692942b00e18a200082409bc--guardian-box.netlify.app', // Your Netlify URL
    'https://guardian-box.netlify.app', // Main Netlify domain (if you have one)
    /\.netlify\.app$/, // Allow all Netlify preview deployments
  ],
  
  // Tier Limits
  limits: {
    [Tier.FREE]: {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxExpirationHours: 24,
      maxDownloads: 1,
    },
    [Tier.PRO]: {
      maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
      maxExpirationHours: 30 * 24, // 30 days
      maxDownloads: null, // unlimited
    },
  },
  
  // Cleanup
  cleanupIntervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '60', 10),
};