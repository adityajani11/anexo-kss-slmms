const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("./s3Client");
const path = require("path");
require("dotenv").config();
const bucket = process.env.AWS_BUCKET;

function safeFileName(original) {
  const name = path.basename(original).replace(/\s+/g, "-");
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${name}`;
}

/**
 * Upload buffer to S3
 * @param {Buffer} buffer
 * @param {String} key
 * @param {String} contentType
 */
async function uploadBufferToS3(
  buffer,
  key,
  contentType = "application/octet-stream"
) {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: "private",
  });
  await s3.send(cmd);
  return key;
}

/**
 * Helper to build key from folder and original filename
 */
function buildKey(folder, originalName) {
  const name = safeFileName(originalName);
  return `uploads/${folder}/${name}`;
}

module.exports = {
  uploadBufferToS3,
  buildKey,
};
