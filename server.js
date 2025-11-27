// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
require("dotenv").config();

const {
  uploadEncryptedBufferToB2,
  downloadEncryptedFromB2ById,
} = require("./b2");

// -------------------- IMPORT AUTH ROUTES --------------------
const authRoutes = require("./src/routes/auth"); // <--- REQUIRED!!!

const app = express();
const upload = multer(); // store files in memory

// -------------------- CORS CONFIG --------------------
app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// -------------------- MOUNT AUTH ROUTES --------------------
app.use("/api/auth", authRoutes); // <--- THIS FIXES SIGNUP/LOGIN

// ------------------ HEALTH CHECK ------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ------------------ FAKE AUTH (replace later) ------------------
function fakeAuth(req, res, next) {
  req.user = { id: "user123" }; // In real app, decoded from token
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

    // filename path inside B2 bucket
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
    const fileId = req.params.fileId;

    const encryptedBuffer = await downloadEncryptedFromB2ById(fileId);

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="encrypted-${fileId}.bin"`
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
