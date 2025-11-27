// src/UploadEncrypted.js
import React, { useState } from "react";
import { encryptFileWithPassword } from "./crypto-utils";

function UploadEncrypted() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [uploadedFileId, setUploadedFileId] = useState("");

  async function handleUpload() {
    if (!file || !password) {
      alert("Select a file and enter password");
      return;
    }

    // 1. Encrypt file in browser
    const { encryptedBlob, salt, iv } = await encryptFileWithPassword(file, password);

    // 2. Build expiration (24 hours default)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // 3. Build formData to send to backend
    const formData = new FormData();
    formData.append("file", encryptedBlob, file.name + ".enc");
    formData.append("originalFilename", file.name);
    formData.append("size", file.size);
    formData.append("tier", "PRO");               // or FREE
    formData.append("expiresAt", expiresAt.toISOString());
    formData.append("maxDownloads", "10");
    formData.append("salt", salt);
    formData.append("iv", iv);

    // 4. Upload to GuardianBox backend
    const res = await fetch("http://localhost:4000/api/files", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    console.log("Upload response:", data);

    if (data.id) {
      setUploadedFileId(data.id);
      alert("Uploaded successfully! File ID: " + data.id);
    } else {
      alert("Upload error");
    }
  }

  return (
    <div style={{ border: "1px solid #ccc", padding: 16, margin: 16 }}>
      <h2>Upload Encrypted File (GuardianBox Compatible)</h2>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files && e.target.files[0])}
      /><br /><br />

      <input
        type="password"
        placeholder="Password to encrypt file"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      /><br /><br />

      <button onClick={handleUpload}>Encrypt & Upload</button>

      {uploadedFileId && (
        <div style={{ marginTop: 16 }}>
          <p>File ID: <code>{uploadedFileId}</code></p>

          <p>
            Download Link:<br />
            <code>
              http://localhost:8080/download/{uploadedFileId}#pw={password}
            </code>
          </p>
        </div>
      )}
    </div>
  );
}

export default UploadEncrypted;
