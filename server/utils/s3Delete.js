const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("./s3Client");
require("dotenv").config();
const bucket = process.env.AWS_BUCKET;

async function deleteFromS3(key) {
  if (!key) return;
  const cmd = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  try {
    await s3.send(cmd);
  } catch (err) {
    console.error("s3 delete error:", err.message);
  }
}

module.exports = deleteFromS3;
