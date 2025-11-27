// b2.js
const B2 = require("backblaze-b2");
const crypto = require("crypto");
require("dotenv").config();

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
});

async function authorize() {
  // you could cache this later
  await b2.authorize();
}

async function uploadEncryptedBufferToB2(fileName, buffer) {
  await authorize();

  const uploadUrlResponse = await b2.getUploadUrl({
    bucketId: process.env.B2_BUCKET_ID,
  });

  const uploadUrl = uploadUrlResponse.data.uploadUrl;
  const authToken = uploadUrlResponse.data.authorizationToken;

  const sha1 = crypto.createHash("sha1").update(buffer).digest("hex");

  const result = await b2.uploadFile({
    uploadUrl: uploadUrl,
    uploadAuthToken: authToken,
    fileName: fileName,
    data: buffer,
    hash: sha1,
    contentType: "application/octet-stream",
  });

  return result.data; // { fileId, fileName, ... }
}

async function downloadEncryptedFromB2ById(fileId) {
  await authorize();

  const res = await b2.downloadFileById({
    fileId: fileId,
    responseType: "arraybuffer",
  });

  return Buffer.from(res.data);
}

module.exports = {
  uploadEncryptedBufferToB2,
  downloadEncryptedFromB2ById,
};
