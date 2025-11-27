import { Router } from "express";
import multer from "multer";
import { fileShareService } from "../services/fileShareService.js";
import { validateUpload } from "../middleware/validation.js";
import { qrTokenService } from "../services/qrTokenService.js";
import { config } from "../config/index.js";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// Multer in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB max
  },
});

/**
 * ---------------------------------------------------------
 * GET /api/files
 * List ALL file shares (for dashboard)
 * ---------------------------------------------------------
 */
router.get("/", async (req, res, next) => {
  try {
    const files = await fileShareService.getAllFileShares();
    res.json(files);
  } catch (error) {
    next(error);
  }
});

/**
 * ---------------------------------------------------------
 * POST /api/files
 * Upload encrypted file
 * ---------------------------------------------------------
 */
router.post(
  "/",
  upload.single("file"),
  validateUpload,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const metadata = {
        originalFilename: req.body.originalFilename,
        size: req.file.size,
        tier: req.body.tier.toUpperCase(),
        expiresInHours: req.body.expiresInHours
          ? parseInt(req.body.expiresInHours, 10)
          : undefined,
        expiresAt: req.body.expiresAt,
        maxDownloads: parseInt(req.body.maxDownloads, 10),
        salt: req.body.salt,
        iv: req.body.iv,
        ownerUserId: req.body.ownerUserId,
      };

      const result = await fileShareService.createFileShare(
        req.file.buffer,
        metadata
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * ---------------------------------------------------------
 * GET /api/files/:id/metadata
 * ---------------------------------------------------------
 */
router.get("/:id/metadata", async (req, res, next) => {
  try {
    const metadata = await fileShareService.getFileMetadata(req.params.id);
    res.json(metadata);
  } catch (error) {
    next(error);
  }
});

/**
 * ---------------------------------------------------------
 * GET /api/files/:id/qr
 * Generate secure 5-minute QR token
 * ---------------------------------------------------------
 */
router.get("/:id/qr", async (req, res) => {
  const { id } = req.params;

  try {
    const token = crypto.randomUUID();
    const ttl = 300;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await prisma.qRToken.create({
      data: {
        token,
        fileId: id,
        expiresAt,
      },
    });

    const qrUrl = `${config.baseUrl}/api/files/${id}/download?qr=${token}`;

    res.json({ qrUrl, ttl });
  } catch (err) {
    console.error("QR generation error:", err);
    res.status(500).json({ error: "Failed to generate QR token" });
  }
});

/**
 * ---------------------------------------------------------
 * GET /api/files/:id/download
 * Normal download + QR token validation
 * ---------------------------------------------------------
 */
router.get("/:id/download", async (req, res, next) => {
  try {
    const fileId = req.params.id;
    const qrToken = req.query.qr;

    // If downloaded via QR
    if (qrToken) {
      const found = await prisma.qRToken.findUnique({
        where: { token: qrToken },
      });

      if (!found || found.expiresAt < new Date() || found.fileId !== fileId) {
        return res.status(401).json({ error: "Invalid or expired QR token" });
      }

      // One-time use
      await prisma.qRToken.delete({
        where: { token: qrToken },
      });
    }

    // Standard download logic
    const { buffer, filename } = await fileShareService.downloadFile(fileId);

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

/**
 * ---------------------------------------------------------
 * DELETE /api/files/:id
 * ---------------------------------------------------------
 */
router.delete("/:id", async (req, res, next) => {
  try {
    await fileShareService.deleteFileShare(req.params.id);
    res.json({ message: "File deleted successfully", id: req.params.id });
  } catch (error) {
    next(error);
  }
});

export default router;
