const MCQ = require("../models/MCQ");
const fs = require("fs");
const puppeteer = require("puppeteer");
const mongoose = require("mongoose");
const { buildHTML } = require("../utils/buildHTML");
// near top of file
const { uploadBufferToS3, buildKey } = require("../utils/s3Uploads");
const deleteFromS3 = require("../utils/s3Delete");

// basic validation helper
const ensureOneCorrect = (options) => {
  if (!Array.isArray(options) || options.length < 2)
    throw new Error("At least 2 options required");
  const correct = options.filter((o) => o.isCorrect);
  if (correct.length !== 1)
    throw new Error("Exactly one option must be correct");
};

function mapFiles(files = []) {
  const map = {};
  for (const f of files) {
    if (!map[f.fieldname]) map[f.fieldname] = [];
    map[f.fieldname].push(f);
  }
  return map;
}

function toBool(v) {
  if (typeof v === "boolean") return v;
  if (v === undefined || v === null) return false;
  const s = String(v).toLowerCase().trim();
  return s === "true" || s === "1" || s === "on" || s === "yes";
}

exports.createMCQ = async (req, res) => {
  const files = mapFiles(req.files);

  try {
    const { standardId, categoryId, subjectId, questionText, explanation } =
      req.body;

    if (!standardId || !categoryId || !subjectId || !questionText) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields (standardId/categoryId/subjectId/questionText).",
        received: { standardId, categoryId, subjectId, questionText },
      });
    }

    // Parse options JSON (THIS IS WHAT YOUR FRONTEND SENDS)
    let options = req.body.options;
    if (typeof options === "string") {
      options = JSON.parse(options);
    }

    const parsedOptions = [];

    for (let i = 0; i < options.length; i++) {
      const bodyOpt = options[i];

      const uploaded = files[`optionImage_${i}`]?.[0] || null;

      let imagePath = bodyOpt.image || null;

      if (uploaded?.buffer) {
        const key = buildKey("mcq", uploaded.originalname);
        await uploadBufferToS3(uploaded.buffer, key, uploaded.mimetype);
        imagePath = key;
      }

      parsedOptions.push({
        label: bodyOpt.label?.trim() || "",
        isCorrect: toBool(bodyOpt.isCorrect),
        image: imagePath,
      });
    }

    // fallback if req.body.options contains JSON array
    if (parsedOptions.length === 0 && req.body.options) {
      try {
        const alt =
          typeof req.body.options === "string"
            ? JSON.parse(req.body.options)
            : req.body.options;
        if (Array.isArray(alt)) {
          alt.forEach((o, i) => {
            parsedOptions.push({
              label: o.label ?? "",
              isCorrect: toBool(o.isCorrect),
              image: null, // if they provided o.image you may keep it; here we prefer uploads
            });
          });
        }
      } catch (err) {
        // ignore
      }
    }

    if (!Array.isArray(parsedOptions) || parsedOptions.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No options found in request. Make sure keys like options[0][label] are sent.",
        bodyKeys: Object.keys(req.body),
      });
    }

    const correctCount = parsedOptions.filter(
      (o) => o.isCorrect === true
    ).length;
    if (correctCount !== 1) {
      return res.status(400).json({
        success: false,
        message: "Exactly one option must be marked as correct.",
        parsedOptions,
      });
    }

    // question image (optional)
    const questionFile = files.questionImage?.[0] || null;
    let questionImagePath = null;
    if (questionFile && questionFile.buffer) {
      const key = buildKey("mcq", questionFile.originalname);
      await uploadBufferToS3(questionFile.buffer, key, questionFile.mimetype);
      questionImagePath = key;
    }

    // New added V1 : Start
    const explanationFile = files.explanationImage?.[0] || null;
    let explanationImagePath = null;

    if (explanationFile?.buffer) {
      const key = buildKey("mcq", explanationFile.originalname);
      await uploadBufferToS3(
        explanationFile.buffer,
        key,
        explanationFile.mimetype
      );
      explanationImagePath = key;
    }
    // New added V1 : Start

    const mcq = await MCQ.create({
      standardId,
      categoryId,
      subjectId,
      question: {
        text: questionText,
        image: questionImagePath,
        language: req.body.language || "gu",
        font: req.body.font || "Default",
      },
      options: parsedOptions,
      explanation: {
        text: typeof explanation === "string" ? explanation.trim() : "",
        image: explanationImagePath,
      },
      createdBy: req.user?._id || null,
    });

    return res.status(201).json({ success: true, data: mcq });
  } catch (err) {
    console.error("Error in createMCQ:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    // Build query dynamically
    const q = {};

    if (req.query.standardId) q.standardId = req.query.standardId;
    if (req.query.subjectId) q.subjectId = req.query.subjectId;
    if (req.query.categoryId) q.categoryId = req.query.categoryId;
    if (req.query.createdBy) q.createdBy = req.query.createdBy;

    // Search
    if (req.query.search && req.query.search.trim() !== "") {
      const s = req.query.search.trim();

      q.$or = [
        { "question.text": { $regex: s, $options: "i" } },
        { "explanation.text": { $regex: s, $options: "i" } },
        { "options.label": { $regex: s, $options: "i" } },
      ];
    }

    // For future: handle disabled logic if soft-delete added
    if (req.query.includeDisabled === "true") {
      q.disabled = { $in: [true, false] };
    }

    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    // Fetch total count (for frontend pagination)
    const total = await MCQ.countDocuments(q);

    // Fetch paginated MCQs
    const items = await MCQ.find(q)
      .populate("standardId", "standard")
      .populate("subjectId", "name")
      .populate("categoryId", "name")
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      count: items.length,
      data: items,
    });
  } catch (err) {
    console.error("MCQ list error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const doc = await MCQ.findById(
      req.params.id,
      req.query.includeDisabled ? { includeDisabled: true } : {}
    );
    if (!doc)
      return res.status(404).json({ success: false, error: "not found" });
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Helper to safely delete old file (works for both local path and s3 keys)
// We assume S3 keys are of form 'uploads/...'
function deleteFileIfExists(filePath) {
  if (!filePath) return;
  try {
    // If path looks like uploads/..., treat as S3 key
    if (typeof filePath === "string" && filePath.startsWith("uploads/")) {
      // async delete but don't await to avoid blocking
      deleteFromS3(filePath).catch((e) =>
        console.error("Failed to delete S3 object:", e.message)
      );
    } else {
      // legacy local path - try unlink (non-blocking)
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error("Failed to delete local file:", err.message);
        });
      }
    }
  } catch (err) {
    console.error("deleteFileIfExists error:", err.message);
  }
}

exports.update = async (req, res) => {
  const files = mapFiles(req.files);

  try {
    const { id } = req.params;

    // Fetch existing record
    const existing = await MCQ.findById(id);
    if (!existing)
      return res.status(404).json({ success: false, error: "MCQ not found" });

    // Parse options safely (JSON string or array)
    let options = req.body.options;
    if (typeof options === "string") {
      try {
        options = JSON.parse(options);
      } catch {
        return res
          .status(400)
          .json({ success: false, error: "Invalid options JSON" });
      }
    }

    if (!options || !Array.isArray(options) || options.length === 0) {
      options = existing.options;
    }

    /* ---------------- Merge and handle new uploads ---------------- */
    const mergedOptions = [];

    for (let i = 0; i < options.length; i++) {
      const existingOpt = existing.options[i] || {};
      const bodyOpt = options[i];

      const uploaded = files[`optionImage_${i}`]?.[0];

      if (uploaded && uploaded.buffer) {
        // delete old from S3
        deleteFileIfExists(existingOpt.image);

        const key = buildKey("mcq", uploaded.originalname);
        await uploadBufferToS3(uploaded.buffer, key, uploaded.mimetype);

        mergedOptions.push({
          label: bodyOpt.label ?? existingOpt.label,
          isCorrect: toBool(bodyOpt.isCorrect ?? existingOpt.isCorrect),
          image: key,
        });
      } else {
        mergedOptions.push({
          label: bodyOpt.label ?? existingOpt.label,
          isCorrect: toBool(bodyOpt.isCorrect ?? existingOpt.isCorrect),
          image: existingOpt.image || null,
        });
      }
    }

    // Validate correct option
    ensureOneCorrect(mergedOptions);

    // New added V1 : Start
    let explanationImage = existing.explanation?.image || null;

    if (files.explanationImage?.[0]) {
      deleteFileIfExists(explanationImage);

      const ef = files.explanationImage[0];
      const key = buildKey("mcq", ef.originalname);
      await uploadBufferToS3(ef.buffer, key, ef.mimetype);

      explanationImage = key;
    }
    // New added V1 : End

    /* ---------------- Build Update ---------------- */
    const updateData = {
      standardId: req.body.standardId || existing.standardId,
      categoryId: req.body.categoryId || existing.categoryId,
      subjectId: req.body.subjectId || existing.subjectId,
      options: mergedOptions,
      // New added V1 : explanation: req.body.explanation || existing.explanation,
      explanation: {
        text: req.body.explanation ?? existing.explanation.text,
        image: explanationImage,
      },
      question: {
        text: req.body.questionText || existing.question.text,
        image: existing.question.image,
        language: req.body.language || existing.question.language,
        font: req.body.font || existing.question.font,
      },
    };

    // Replace question image if uploaded
    if (files.questionImage?.[0]) {
      deleteFileIfExists(existing.question.image);
      const qf = files.questionImage[0];
      const key = buildKey("mcq", qf.originalname);
      await uploadBufferToS3(qf.buffer, key, qf.mimetype);
      updateData.question.image = key;
    }

    const updated = await MCQ.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("standardId", "standard")
      .populate("subjectId", "name")
      .populate("categoryId", "name");

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("MCQ update error:", err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

exports.softDelete = async (req, res) => {
  try {
    const doc = await MCQ.findById(req.params.id);
    if (!doc)
      return res.status(404).json({ success: false, error: "not found" });
    if (typeof doc.softDelete === "function") await doc.softDelete();
    else {
      doc.disabled = true;
      await doc.save();
    }
    return res.json({ success: true, message: "soft deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.restore = async (req, res) => {
  try {
    const doc = await MCQ.findOne({
      _id: req.params.id,
      includeDisabled: true,
    });
    if (!doc)
      return res.status(404).json({ success: false, error: "not found" });
    doc.disabled = false;
    await doc.save();
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const doc = await MCQ.findById(req.params.id);
    if (!doc)
      return res.status(404).json({ success: false, error: "not found" });

    // collect keys to delete
    const keysToDelete = [];
    if (
      doc.question?.image &&
      String(doc.question.image).startsWith("uploads/")
    ) {
      keysToDelete.push(doc.question.image);
    }
    if (Array.isArray(doc.options)) {
      doc.options.forEach((o) => {
        if (o.image && String(o.image).startsWith("uploads/"))
          keysToDelete.push(o.image);
      });
    }

    // New added V1 : Start - explanation image delete
    if (
      doc.explanation?.image &&
      String(doc.explanation.image).startsWith("uploads/")
    ) {
      keysToDelete.push(doc.explanation.image);
    }
    // New added V1 : End

    // delete them (parallel)
    await Promise.all(keysToDelete.map((k) => deleteFromS3(k)));

    await MCQ.deleteOne({ _id: req.params.id });
    return res.json({ success: true, message: "hard deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Get MCQs by Standard ID (Paginated + Filters)
exports.getByStandard = async (req, res) => {
  try {
    const { standardId } = req.params;
    if (!standardId) {
      return res
        .status(400)
        .json({ success: false, error: "standardId required" });
    }

    // Pagination params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Filters
    const { subjectId, categoryId, q } = req.query;

    const filter = {
      standardId,
      deleted: { $ne: true },
    };

    if (subjectId) filter.subjectId = subjectId;
    if (categoryId) filter.categoryId = categoryId;

    // Search on question or options text
    if (q && q.trim() !== "") {
      const regex = new RegExp(q.trim(), "i"); // case-insensitive search

      filter.$or = [
        { "question.text": regex },
        { "options.label": regex },
        { "explanation.text": regex },
      ];
    }

    // Count total (for pagination UI)
    const total = await MCQ.countDocuments(filter);

    // Fetch paginated data
    const mcqs = await MCQ.find(filter)
      .populate("subjectId", "name")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.json({
      success: true,
      data: mcqs,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error("Error fetching MCQs:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Get random MCQs by Standard ID (Full Dataset)
exports.getRandomByStandard = async (req, res) => {
  try {
    const { standardId } = req.params;
    const { subjectId, categoryId, q, limit = 120, excludeIds } = req.query;

    if (!standardId) {
      return res
        .status(400)
        .json({ success: false, error: "standardId required" });
    }

    const filter = {
      standardId: new mongoose.Types.ObjectId(standardId),
      deleted: { $ne: true },
    };

    if (subjectId) filter.subjectId = new mongoose.Types.ObjectId(subjectId);
    if (categoryId) filter.categoryId = new mongoose.Types.ObjectId(categoryId);

    if (q && q.trim() !== "") {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { "question.text": regex },
        { "options.label": regex },
        { "explanation.text": regex },
      ];
    }

    // Safe excludeIds parsing
    let excludeList = [];
    if (excludeIds) {
      try {
        excludeList =
          typeof excludeIds === "string" ? JSON.parse(excludeIds) : excludeIds;
      } catch {
        excludeList = [];
      }
    }

    if (excludeList.length > 0) {
      filter._id = {
        $nin: excludeList.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // Random sample
    const randomMcqs = await MCQ.aggregate([
      { $match: filter },
      { $sample: { size: Number(limit) } },
    ]);

    const ids = randomMcqs.map((m) => m._id);

    // Preserve random order during populate
    const docs = await MCQ.find({ _id: { $in: ids } })
      .populate("subjectId", "name")
      .populate("categoryId", "name")
      .lean();

    const map = new Map(docs.map((d) => [String(d._id), d]));
    const populated = ids.map((id) => map.get(String(id))).filter(Boolean);

    return res.json({
      success: true,
      data: populated,
    });
  } catch (err) {
    console.error("Random MCQ fetch error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

/* ---------- API: DOWNLOAD MCQ PDF ROUTE ---------- */
exports.getFilteredMcqPDF = async (req, res) => {
  try {
    console.log(req.body);
    const {
      mcqIds,
      pdfHeading,
      includeAnswers = false,
      includeExplanations = false,
    } = req.body;

    if (!mcqIds || !Array.isArray(mcqIds) || mcqIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No MCQ IDs provided",
      });
    }

    const mcqs = await MCQ.find({ _id: { $in: mcqIds } })
      .populate("subjectId", "name")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 });

    if (!mcqs.length) {
      return res.status(404).json({
        success: false,
        error: "No MCQs found for provided IDs",
      });
    }

    // ✅ USE YOUR UTIL HERE
    const html = buildHTML(
      mcqs,
      pdfHeading,
      includeAnswers,
      includeExplanations
    );

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });

    await page.evaluateHandle("document.fonts.ready");
    await new Promise((r) => setTimeout(r, 100));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div></div>`,
      footerTemplate: `
        <div style="width:100%; font-size:10px; text-align:right; padding-right:20px;">
          Page <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `,
      margin: {
        top: "40px",
        bottom: "40px",
        left: "35px",
        right: "35px",
      },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdfHeading || "mcq"}.pdf"`,
    });

    return res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to generate PDF",
    });
  }
};
