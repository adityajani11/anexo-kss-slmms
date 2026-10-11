// server/controllers/materialController.js
const Material = require("../models/Material");
const mongoose = require("mongoose");
const { uploadBufferToS3, buildKey } = require("../utils/s3Uploads");
const { getPresignedUrl } = require("../utils/s3Get");
const deleteFromS3 = require("../utils/s3Delete");
require("dotenv").config();

// ---------------- CREATE ----------------
exports.create = async (req, res) => {
  try {
    const { title, standardId, subjectId, categoryId } = req.body;

    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ success: false, error: "File is required" });
    }

    const uploadedBy = req.body.uploadedBy || null;
    const uploadedByModel = req.body.uploadedByModel || "staffAdmin";

    if (!uploadedBy || !uploadedByModel) {
      return res.status(401).json({
        success: false,
        error: "Uploader information missing or unauthorized.",
      });
    }

    // build s3 key: uploads/materials/<safe filename>
    const key = buildKey("materials", req.file.originalname);
    await uploadBufferToS3(req.file.buffer, key, req.file.mimetype);

    const relativePath = `${key}`; // store key as fileId and path

    const doc = new Material({
      title,
      standardId,
      subjectId,
      categoryId,
      uploadedBy,
      uploadedByModel,
      path: relativePath,
      file: {
        storage: "aws",
        fileId: relativePath,
        size: req.file.size,
        mime: req.file.mimetype,
      },
    });

    await doc.save();

    return res.status(201).json({
      success: true,
      message: "Material uploaded successfully.",
      data: doc,
    });
  } catch (err) {
    console.error("Error creating material:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------- LIST ---------------- (unchanged except normalization)
exports.list = async (req, res) => {
  try {
    const query = {
      uploadedByModel: { $ne: "student" },
      path: { $not: /^uploads\/admin_papers/ },
    };

    if (req.query.standardId) query.standardId = req.query.standardId;
    if (req.query.subjectId) query.subjectId = req.query.subjectId;
    if (req.query.categoryId) query.categoryId = req.query.categoryId;

    const items = await Material.find(query)
      .populate("standardId", "standard")
      .populate("subjectId", "name")
      .populate("categoryId", "name")
      .populate({
        path: "uploadedBy",
        model: "staffAdmin",
        select: "fullName",
      })
      .sort({ createdAt: -1 });

    const formatted = await Promise.all(
      items.map(async (item) => {
        const normalizedFile = item.file?.fileId
          ? { ...item.file, fileId: item.file.fileId.replace(/\\/g, "/") }
          : item.file;

        // Generate presigned view URL
        const viewUrl = await getPresignedUrl(normalizedFile?.fileId);

        return {
          _id: item._id,
          title: item.title,
          path: item.path.replace(/\\/g, "/"),
          file: normalizedFile,
          viewUrl,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          standard: item.standardId?.standard || "N/A",
          subject: item.subjectId?.name || "N/A",
          category: item.categoryId?.name || "N/A",
          uploadedBy:
            item.uploadedByModel === "staffadmin"
              ? item.uploadedBy?.fullName || "Admin"
              : "Admin",
        };
      })
    );

    return res.json({ success: true, data: formatted });
  } catch (err) {
    console.error("Error fetching materials:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------- VIEW PDF ----------------
// Streams file from S3 to response
const s3 = require("../utils/s3Client");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

exports.getPdf = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res
        .status(404)
        .json({ success: false, error: "Material not found" });
    }

    const fileKey = material.file?.fileId;
    if (!fileKey) {
      return res
        .status(400)
        .json({ success: false, error: "File path not found" });
    }

    // Serve from S3: stream the object
    const cmd = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: fileKey,
    });

    const s3res = await s3.send(cmd);

    res.setHeader("Content-Type", material.file.mime || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${material.title || "material"}.pdf"`
    );

    await streamPipeline(s3res.Body, res);
  } catch (err) {
    console.error("Error serving PDF:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------- DOWNLOAD PDF ----------------
exports.downloadPdf = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res
        .status(404)
        .json({ success: false, error: "Material not found" });
    }

    const fileKey = material.file?.fileId;

    const cmd = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: fileKey,
    });

    const s3res = await s3.send(cmd);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${material.title.replace(/\s+/g, "_")}.pdf"`
    );
    res.setHeader("Content-Type", "application/pdf");

    return streamPipeline(s3res.Body, res);
  } catch (err) {
    console.error("Download error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------- HARD DELETE ----------------
exports.hardDelete = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res
        .status(404)
        .json({ success: false, error: "Material not found" });
    }

    const fileKey = material.file?.fileId;
    if (fileKey) {
      await deleteFromS3(fileKey);
    }

    await Material.deleteOne({ _id: req.params.id });
    return res.json({ success: true, message: "Material deleted permanently" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ---------------- GET materials by standardId ---------------- (unchanged)
exports.getByStandard = async (req, res) => {
  try {
    const { standardId } = req.params;
    if (!standardId) {
      return res
        .status(400)
        .json({ success: false, error: "standardId is required" });
    }

    const materials = await mongoose.connection.db
      .collection("materials")
      .find({
        standardId: new mongoose.Types.ObjectId(standardId),
        deleted: { $ne: true },
        $and: [
          {
            $or: [
              { uploadedByModel: { $exists: false } },
              { uploadedByModel: { $not: /^student$/i } },
            ],
          },
          {
            path: { $not: /^uploads\/admin_papers/ },
          },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();

    if (!materials || materials.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No material found for this standard.",
      });
    }

    const populated = await Material.populate(materials, [
      { path: "standardId", select: "standard" },
      { path: "subjectId", select: "name" },
      { path: "categoryId", select: "name" },
    ]);

    res.json({ success: true, data: populated });
  } catch (err) {
    console.error("Error fetching materials:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
