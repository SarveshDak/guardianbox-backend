// src/crypto-utils.js

async function deriveKeyFromPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptFileWithPassword(file, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKeyFromPassword(password, salt);

  const fileBuffer = await file.arrayBuffer();

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    fileBuffer
  );

  const cipherBytes = new Uint8Array(ciphertext);

  // [salt(16) | iv(12) | ciphertext(N)]
  const out = new Uint8Array(16 + 12 + cipherBytes.length);
  out.set(salt, 0);
  out.set(iv, 16);
  out.set(cipherBytes, 28);

  return new Blob([out], { type: "application/octet-stream" });
}

export async function decryptFileWithPassword(encryptedBuffer, password) {
  const bytes = new Uint8Array(encryptedBuffer);

  const salt = bytes.slice(0, 16);
  const iv = bytes.slice(16, 28);
  const ciphertext = bytes.slice(28);

  const key = await deriveKeyFromPassword(password, salt);

  const plaintext = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    ciphertext
  );

  return plaintext; // ArrayBuffer
}
