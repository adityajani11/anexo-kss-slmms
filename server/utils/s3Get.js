const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("./s3Client");
require("dotenv").config();
const bucket = process.env.AWS_BUCKET;

async function getPresignedUrl(
  key,
  expiresIn = Number(process.env.S3_URL_EXPIRES || 3600)
) {
  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}

module.exports = { getPresignedUrl };
