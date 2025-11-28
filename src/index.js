import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import filesRouter from './routes/files.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { fileShareService } from './services/fileShareService.js';
import authRouter from "./routes/auth.js"; 

const app = express();

// IMPORTANT: Apply CORS BEFORE Helmet
app.use(cors({
  origin: [
    'https://guardian-box.netlify.app',
    'https://69294f90ebad0b6000786136--guardian-box.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configure Helmet to not interfere with CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API routes
app.use("/api/auth", authRouter);
app.use('/api/files', filesRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Cleanup scheduler
function startCleanupScheduler() {
  const intervalMs = config.cleanupIntervalMinutes * 60 * 1000;

  console.log(
    `Starting cleanup scheduler (every ${config.cleanupIntervalMinutes} minutes)`
  );

  setInterval(async () => {
    try {
      console.log('Running cleanup task...');
      const deletedCount = await fileShareService.cleanupExpiredFiles();
      console.log(`Cleanup complete: ${deletedCount} expired files deleted`);
    } catch (error) {
      console.error('Cleanup task failed:', error);
    }
  }, intervalMs);

  // Run immediately on startup
  fileShareService
    .cleanupExpiredFiles()
    .then((count) =>
      console.log(`Initial cleanup: ${count} expired files deleted`)
    )
    .catch((err) => console.error('Initial cleanup failed:', err));
}

// Start server
app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════╗
║      GuardianBox Backend API           ║
║  End-to-End Encrypted File Sharing     ║
╚════════════════════════════════════════╝

🚀 Server running on port ${config.port}
🌐 Base URL: ${config.baseUrl}
🗄️  Storage: ${config.storageType}
📊 Environment: ${config.nodeEnv}

CORS allowed origins:
${config.corsOrigins.map((o) => `  - ${o}`).join('\n')}
  `);

  // Start cleanup scheduler
  startCleanupScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;