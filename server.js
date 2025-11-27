// server.js
const express = require("express");
const multer = require("multer");
const cors = require("cors");
require("dotenv").config();

const {
  uploadEncryptedBufferToB2,
  downloadEncryptedFromB2ById,
} = require("./b2");

const app = express();
const upload = multer(); // store files in memory

app.use(cors());
app.use(express.json());

// ------------------ HEALTH CHECK ------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
// ---------------------------------------------------

// SIMPLE AUTH PLACEHOLDER (replace with real login later)
function fakeAuth(req, res, next) {
  // in real app, you’d read user from token/cookie
  req.user = { id: "user123" };
  next();
}

app.post("/api/files/upload", fakeAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const originalName = req.body.originalName || "file";
    const userId = req.user.id;

    // file name/key inside B2
    const b2FileName = `${userId}/${Date.now()}-${originalName}.enc`;

    const b2File = await uploadEncryptedBufferToB2(
      b2FileName,
      req.file.buffer
    );

    // TODO: Save this in DB (owner, originalName, b2File.fileId, etc.)

    res.json({
      ok: true,
      fileId: b2File.fileId,
      fileName: b2File.fileName,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/api/files/download/:fileId", fakeAuth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const userId = req.user.id;

    // TODO: Check in DB that this file belongs to userId

    const encryptedBuffer = await downloadEncryptedFromB2ById(fileId);

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="encrypted-${fileId}.bin"`
    );
    res.send(encryptedBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Download failed" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Backend listening on http://localhost:" + port);
});
