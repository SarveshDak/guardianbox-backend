// server.js (ESM Version)
import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import {
  uploadEncryptedBufferToB2,
  downloadEncryptedFromB2ById,
} from "./b2.js";

import authRoutes from "./src/routes/auth.js";

const app = express();
const upload = multer();

// -------------------- CORS --------------------
app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// -------------------- AUTH ROUTES --------------------
app.use("/api/auth", authRoutes);

// ------------------ HEALTH ROUTE ------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ------------------ TEMP FAKE AUTH ------------------
function fakeAuth(req, res, next) {
  req.user = { id: "user123" };
  next();
}

// ------------------ FILE UPLOAD ------------------
app.post("/api/files/upload", fakeAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const originalName = req.body.originalName || "file";
    const userId = req.user.id;

    const b2FileName = `${userId}/${Date.now()}-${originalName}.enc`;

    const b2File = await uploadEncryptedBufferToB2(
      b2FileName,
      req.file.buffer
    );

    res.json({
      ok: true,
      fileId: b2File.fileId,
      fileName: b2File.fileName,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ------------------ FILE DOWNLOAD ------------------
app.get("/api/files/download/:fileId", fakeAuth, async (req, res) => {
  try {
    const encryptedBuffer = await downloadEncryptedFromB2ById(
      req.params.fileId
    );

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="encrypted-${req.params.fileId}.bin"`
    );

    res.send(encryptedBuffer);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Download failed" });
  }
});

// ------------------ START SERVER ------------------
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Backend running on http://localhost:" + port);
});
