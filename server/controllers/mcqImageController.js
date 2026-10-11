const s3 = require("../utils/s3Client");
const { GetObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

exports.getImage = async (req, res) => {
  try {
    const key = decodeURIComponent(req.query.key);

    if (!key) {
      return res.status(400).json({ success: false, error: "Key missing" });
    }

    // First try to get metadata (content type)
    let contentType = "image/jpeg";
    try {
      const head = await s3.send(
        new HeadObjectCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: key,
        })
      );
      contentType = head.ContentType || contentType;
    } catch {
      // fallback to infer from file extension
      if (key.endsWith(".png")) contentType = "image/png";
      else if (key.endsWith(".jpg") || key.endsWith(".jpeg"))
        contentType = "image/jpeg";
      else if (key.endsWith(".gif")) contentType = "image/gif";
      else if (key.endsWith(".webp")) contentType = "image/webp";
      else if (key.endsWith(".svg")) contentType = "image/svg+xml";
    }

    const cmd = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: key,
    });

    const s3res = await s3.send(cmd);

    res.setHeader("Content-Type", contentType);

    await streamPipeline(s3res.Body, res);
  } catch (err) {
    console.error("MCQ image fetch error:", err);
    res.status(404).json({ success: false, error: "Image not found" });
  }
};
