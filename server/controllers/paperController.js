// controllers/paperController.js
const mongoose = require("mongoose");
const MCQModel = require("../models/MCQ");
const Paper = require("../models/Paper");
const ExamAttempt = require("../models/ExamAttempt");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const fs = require("fs");
const path = require("path");
const { buildHTML } = require("../utils/buildHTML");
const puppeteer = require("puppeteer");
const Material = require("../models/Material");

// Utility: pick random items
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

/* ---------- SAVE STUDENT-GENERATED PAPER ---------- */
exports.generatePaper = async (req, res) => {
  try {
    const { mcqs, pdfHeading, includeAnswers, title, studentId, standardId } =
      req.body;

    // --- Validate input ---
    if (!studentId || !standardId) {
      return res.status(400).json({
        success: false,
        error: "studentId and standardId are required (dev mode)",
      });
    }

    if (!mcqs || !Array.isArray(mcqs) || mcqs.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No MCQs provided for PDF generation",
      });
    }

    // --- Fetch MCQs ---
    const mcqDocs = await MCQModel.find({ _id: { $in: mcqs } })
      .populate("subjectId categoryId")
      .lean();

    if (mcqDocs.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No valid MCQs found for provided IDs",
      });
    }

    const includeAns = includeAnswers === true;
    const includeExp = includeAns; // auto-enable explanation when answers enabled

    // --- Build HTML ---
    const html = buildHTML(
      mcqDocs,
      pdfHeading || "Student Draft Paper",
      includeAns,
      includeExp
    );

    // --- Generate PDF using Puppeteer ---
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

    // --- Subjects from MCQs ---
    const subjectIds = [
      ...new Set(mcqDocs.map((m) => m.subjectId?._id).filter(Boolean)),
    ];

    // --- Paper Items ---
    const paperItems = mcqDocs.map((m, i) => ({
      mcqId: m._id,
      marks: 1,
      order: i + 1,
    }));

    // --- Create Paper entry ---
    const paper = await Paper.create({
      title: title || "My Draft Paper",
      type: "STUDENT_DRAFT",
      createdBy: studentId,
      createdByModel: "Student",
      standardId,
      subjectIds,
      includeAnswers: !!includeAnswers,
      includeExplanations: false,
      totalMarks: paperItems.length,
      items: paperItems,
      generatedPdf: null,
    });

    return res.status(200).json({
      success: true,
      message: "Paper generated and saved successfully.",
      data: paper,
    });
  } catch (err) {
    console.error("Paper Generation Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to generate and save paper",
    });
  }
};

/* Get student generated paper */
exports.getMyPapers = async (req, res) => {
  try {
    const studentId = req.user?._id || req.query.studentId;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: "Missing studentId or not authenticated.",
      });
    }

    const papers = await Paper.find({
      createdBy: studentId,
      createdByModel: "Student",
      type: "STUDENT_DRAFT",
    })
      .populate("generatedPdf.fileId", "path title")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: papers,
    });
  } catch (err) {
    console.error("Get Papers Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve your papers.",
    });
  }
};

/* ---------- DOWNLOAD PAPER AS PDF (with KaTeX + Gujarati support) ---------- */
exports.downloadPaper = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { answers, studentId } = req.query;

    const includeAnswers = answers === "true";

    // Find paper
    const paper = await Paper.findOne({
      _id: paperId,
      createdBy: studentId,
      createdByModel: "Student",
    });

    if (!paper) {
      return res.status(404).json({
        success: false,
        error: "Paper not found or access denied.",
      });
    }

    // Fetch MCQs for this paper
    const paperDoc = await Paper.findById(paperId).populate({
      path: "items.mcqId",
      populate: { path: "subjectId categoryId" },
    });

    const mcqs = paperDoc.items.map((i) => i.mcqId).filter(Boolean);

    // If answers included, also include explanations
    const includeExp = includeAnswers;

    // Build dynamic HTML with KaTeX + Gujarati + filters
    const html = buildHTML(
      mcqs,
      paper.title || "Student Paper",
      includeAnswers,
      includeExp
    );

    // Generate PDF via Puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });

    // Wait for all fonts and KaTeX math to finish rendering
    await page.evaluateHandle("document.fonts.ready");
    await new Promise((r) => setTimeout(r, 400));

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

    // Send PDF to client
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${
        paper.title || "StudentPaper"
      }.pdf"`,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("Paper Download Error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to prepare or download paper.",
    });
  }
};

// ADMIN / STAFF Paper generation API
exports.generateAdminPaper = async (req, res) => {
  try {
    const {
      mcqs,
      pdfHeading,
      includeAnswers,
      includeExplanations,
      title,
      standardId,
      subjectId,
      userId, // must come from frontend
    } = req.body;

    // -------- VALIDATION --------
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Unauthenticated request (userId missing)",
      });
    }

    if (!standardId) {
      return res.status(400).json({
        success: false,
        error: "standardId is required",
      });
    }

    if (!mcqs || !Array.isArray(mcqs) || mcqs.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Please provide at least one MCQ",
      });
    }

    if (mcqs.length > 120) {
      return res.status(400).json({
        success: false,
        error: "You can generate a maximum of 120 MCQs",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: "Title is required",
      });
    }

    // -------- FETCH MCQS --------
    const mcqDocs = await MCQModel.find({ _id: { $in: mcqs } })
      .populate("standardId subjectId categoryId")
      .lean();

    if (!mcqDocs.length) {
      return res.status(404).json({
        success: false,
        error: "No valid MCQs found",
      });
    }

    // -------- VALIDATE STANDARD / SUBJECT MATCH --------
    for (const mcq of mcqDocs) {
      if (String(mcq.standardId?._id) !== String(standardId)) {
        return res.status(400).json({
          success: false,
          error: `Some MCQs do not belong to selected standard`,
        });
      }
      if (subjectId && String(mcq.subjectId?._id) !== String(subjectId)) {
        return res.status(400).json({
          success: false,
          error: `Some MCQs do not belong to selected subject`,
        });
      }
    }

    // -------- SUBJECT LIST FROM MCQS --------
    const subjectIds = [
      ...new Set(
        mcqDocs.flatMap((m) => (m.subjectId?._id ? [m.subjectId._id] : []))
      ),
    ];

    // Use subjectId if no subjects found in MCQs (fallback)
    const primarySubject = subjectIds[0] || subjectId || null;

    // -------- BUILD HTML FOR PDF --------
    const html = buildHTML(
      mcqDocs,
      pdfHeading || "",
      includeAnswers,
      includeExplanations
    );

    // -------- GENERATE PDF --------
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });

    await page.evaluateHandle("document.fonts.ready");

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

    // -------- PAPER ITEMS --------
    const items = mcqDocs.map((m, i) => ({
      mcqId: m._id,
      marks: 1,
      order: i + 1,
    }));

    // -------- CREATE PAPER ENTRY --------
    const paper = await Paper.create({
      title: title.trim(),
      type: "GENERATED",
      createdBy: userId,
      createdByModel: "staffAdmin",
      standardId,
      subjectIds,
      includeAnswers: !!includeAnswers,
      includeExplanations: !!includeExplanations,
      totalMarks: items.length,
      items,
      generatedPdf: null,
    });

    // -------- RETURN PDF TO FRONTEND --------
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfHeading}"`,
    });

    return res.send(pdfBuffer);
  } catch (err) {
    console.error("Admin Paper Generation Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

/* ======================================================
   GET /api/v1/papers/:paperId/mcqs
   Fetch all MCQs of a paper (for live exam)
====================================================== */
exports.getPaperMcqs = async (req, res) => {
  try {
    const { paperId } = req.params;

    const paper = await Paper.findById(paperId)
      .populate({
        path: "items.mcqId",
        populate: [
          { path: "standardId", select: "standard" },
          { path: "subjectId", select: "name" },
        ],
      })
      .lean();

    if (!paper)
      return res
        .status(404)
        .json({ success: false, message: "Paper not found" });

    // Helper to normalize image paths (fixes Windows backslashes)
    const normalizeImage = (imgPath) => {
      if (!imgPath) return null;
      if (imgPath.startsWith("http")) return imgPath;
      return imgPath
        .replace(/\\/g, "/") // replace backslashes with slashes
        .replace(/^\/+/, ""); // remove leading slashes if any
    };

    // Build MCQs with normalized image URLs
    const mcqs = paper.items
      .filter((item) => item.mcqId)
      .map((item) => {
        const mcq = item.mcqId;
        return {
          _id: mcq._id,
          question: {
            text: mcq.question.text,
            image: normalizeImage(mcq.question.image),
            language: mcq.question.language,
            font: mcq.question.font,
          },
          options: mcq.options.map((opt) => ({
            label: opt.label,
            image: normalizeImage(opt.image),
            isCorrect: opt.isCorrect,
          })),
          correctOption: mcq.options.findIndex((opt) => opt.isCorrect),
          explanation: mcq.explanation || "",
          marks: item.marks || 1,
          order: item.order || 0,
        };
      });

    return res.json({
      success: true,
      message: "MCQs fetched successfully",
      data: mcqs,
    });
  } catch (err) {
    console.error("Error fetching paper MCQs:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching MCQs",
    });
  }
};

/**
 * Start exam for a generated paper.
 * Body: { paperId }
 * Creates ExamAttempt with startedAt set now, responses empty, score.max = paper.totalMarks
 * Returns attemptId and startedAt & max duration.
 */
exports.startExam = async (req, res) => {
  try {
    const { paperId } = req.body;
    const studentId = req.user && req.user._id;
    if (!paperId || !studentId) {
      return res
        .status(400)
        .json({ success: false, error: "paperId required" });
    }

    const paper = await Paper.findById(paperId).populate("items.mcqId");
    if (!paper)
      return res.status(404).json({ success: false, error: "Paper not found" });

    // Ensure totalMarks <= 120
    if (paper.totalMarks > 120) {
      return res
        .status(400)
        .json({ success: false, error: "Paper exceeds maximum marks allowed" });
    }

    // Create or find open attempt (idempotency)
    let attempt = await ExamAttempt.findOne({
      studentId,
      paperId,
      submittedAt: { $exists: false },
    });

    if (!attempt) {
      attempt = new ExamAttempt({
        studentId,
        paperId,
        standardId: paper.standardId,
        subjectIds: paper.subjectIds,
        startedAt: new Date(),
        responses: [],
        score: { total: 0, max: paper.totalMarks },
      });
      await attempt.save();
    }

    // Duration rule: 1 mark = 1 minute
    const durationMinutes = paper.totalMarks;
    return res.json({
      success: true,
      data: {
        attemptId: attempt._id,
        startedAt: attempt.startedAt,
        durationMinutes,
        paper: {
          _id: paper._id,
          title: paper.title,
          items: paper.items.map((it) => ({
            mcqId: it.mcqId._id,
            question: it.mcqId.question,
            options: it.mcqId.options,
          })),
        },
      },
    });
  } catch (err) {
    console.error("startExam error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * Get attempt data (used to resume).
 * Params: attemptId
 */
exports.getAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user && req.user._id;
    if (!attemptId)
      return res
        .status(400)
        .json({ success: false, error: "attemptId required" });

    const attempt = await ExamAttempt.findById(attemptId)
      .populate("paperId")
      .lean();
    if (!attempt)
      return res
        .status(404)
        .json({ success: false, error: "Attempt not found" });
    if (!attempt.studentId.equals(studentId))
      return res.status(403).json({ success: false, error: "Unauthorized" });

    // Compute duration from associated paper
    const paper = await Paper.findById(attempt.paperId._id).lean();
    const durationMinutes = paper.totalMarks;

    return res.json({
      success: true,
      data: { attempt, durationMinutes, paper },
    });
  } catch (err) {
    console.error("getAttempt error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * Submit exam.
 * Body: { attemptId, responses: [{ mcqId, selectedIndex }] }
 * Grades the exam and sets submittedAt.
 */
exports.submitExam = async (req, res) => {
  try {
    const { attemptId, responses = [] } = req.body;
    const studentId = req.user && req.user._id;
    if (!attemptId)
      return res
        .status(400)
        .json({ success: false, error: "attemptId required" });

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt)
      return res
        .status(404)
        .json({ success: false, error: "Attempt not found" });
    if (!attempt.studentId.equals(studentId))
      return res.status(403).json({ success: false, error: "Unauthorized" });

    // Load paper + MCQs
    const paper = await Paper.findById(attempt.paperId).lean();
    const mcqIds = paper.items.map((it) => it.mcqId.toString());
    const mcqs = await MCQModel.find({ _id: { $in: mcqIds } }).lean();

    // Build map for grading
    const mcqMap = {};
    mcqs.forEach((m) => (mcqMap[m._id.toString()] = m));

    // Grade
    let totalAwarded = 0;
    const processed = responses.map((r) => {
      const mcq = mcqMap[r.mcqId];
      let selectedIndex =
        typeof r.selectedIndex === "number" ? r.selectedIndex : -1;
      let correct = false;
      if (mcq && mcq.options && mcq.options[selectedIndex]) {
        correct = !!mcq.options[selectedIndex].isCorrect;
      }
      const marksAwarded = correct ? 1 : 0;
      totalAwarded += marksAwarded;
      return {
        mcqId: r.mcqId,
        selectedIndex,
        correct,
        marksAwarded,
      };
    });

    attempt.responses = processed;
    attempt.submittedAt = new Date();
    attempt.score = { total: totalAwarded, max: paper.totalMarks };

    await attempt.save();

    return res.json({ success: true, data: attempt });
  } catch (err) {
    console.error("submitExam error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * Get exam history for student
 * Query params: page, limit
 */
exports.getHistory = async (req, res) => {
  try {
    const studentId = req.user && req.user._id;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 10);

    const q = { studentId: mongoose.Types.ObjectId(studentId) };
    const total = await ExamAttempt.countDocuments(q);
    const items = await ExamAttempt.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("paperId", "title totalMarks")
      .lean();

    return res.json({ success: true, data: { total, page, limit, items } });
  } catch (err) {
    console.error("getHistory error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * Get generated papers for student
 */
// exports.getGeneratedPapers = async (req, res) => {
//   try {
//     const studentId = req.user && req.user._id;
//     const papers = await Paper.find({ createdBy: studentId })
//       .sort({ createdAt: -1 })
//       .lean();
//     return res.json({ success: true, data: papers });
//   } catch (err) {
//     console.error("getGeneratedPapers error:", err);
//     return res.status(500).json({ success: false, error: "Server error" });
//   }
// };

// GET /papers/fetch/type=GENERATED - FOR STAFF / ADMIN
exports.getGeneratedPapers = async (req, res) => {
  try {
    const papers = await Paper.find(
      { type: "GENERATED", disabled: false },
      {
        __v: 0,
        updatedAt: 0,
        createdAt: 0,
      }
    )
      .populate({
        path: "createdBy",
        select: "_id role username fullName", // only required fields
      })
      .populate({
        path: "subjectIds",
        select: "_id name", // only two fields
      })
      .populate({
        path: "generatedPdf.fileId",
        select: "_id title path", // include what is needed (reduce size)
      })
      .lean();

    return res.json({
      success: true,
      data: papers,
    });
  } catch (err) {
    console.error("Fetch Generated Papers Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// GET /papers/:paperId/download-generated?answers=true/false - FOR ADMIN / STAFF
exports.downloadGeneratedPaper = async (req, res) => {
  try {
    const { paperId } = req.params;
    const includeAnswers = req.query.answers === "true";

    const paper = await Paper.findOne({
      _id: paperId,
      type: "GENERATED",
    })
      .populate({
        path: "items.mcqId",
        populate: { path: "subjectId categoryId" },
      })
      .lean();

    if (!paper) {
      return res.status(404).json({
        success: false,
        error: "Paper not found.",
      });
    }

    // extract MCQs
    const mcqs = paper.items.map((i) => i.mcqId).filter(Boolean);

    // explanations included when answers=true
    const includeExp = includeAnswers;

    // Build HTML
    const html = buildHTML(mcqs, paper.title, includeAnswers, includeExp);

    // Generate PDF
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
    });

    await page.evaluateHandle("document.fonts.ready");
    await new Promise((r) => setTimeout(r, 300));

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
      "Content-Disposition": `attachment; filename="${(
        paper.title || "GeneratedPaper"
      ).replace(/\s+/g, "_")}.pdf"`,
    });

    return res.send(pdfBuffer);
  } catch (err) {
    console.error("Download Generated Paper Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to download paper.",
    });
  }
};

// Hard delete a generated paper - STAFF / ADMIN
exports.deleteGeneratedPaper = async (req, res) => {
  try {
    const { paperId } = req.params;

    const paper = await Paper.findOne({ _id: paperId, type: "GENERATED" });
    if (!paper) {
      return res.status(404).json({
        success: false,
        error: "Paper not found",
      });
    }

    // Delete linked material (if exists)
    if (paper.generatedPdf?.fileId) {
      await Material.deleteOne({ _id: paper.generatedPdf.fileId });
    }

    // OPTIONAL: delete physical PDF file from server
    // If you want this, provide file path column in material

    // delete paper
    await Paper.deleteOne({ _id: paperId });

    return res.json({
      success: true,
      message: "Generated paper deleted successfully.",
    });
  } catch (err) {
    console.error("Delete Generated Paper Error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to delete paper.",
    });
  }
};

/* ---------- DELETE STUDENT'S PAPER ---------- */
exports.deletePaper = async (req, res) => {
  try {
    const { paperId, studentId } = req.params;

    const paper = await Paper.findOne({
      _id: paperId,
      createdBy: studentId,
      createdByModel: "Student",
    });

    if (!paper) {
      return res
        .status(404)
        .json({ success: false, message: "Paper not found or not yours" });
    }

    await Paper.deleteOne({ _id: paperId });

    await ExamAttempt.deleteMany({ paperId });

    return res.json({
      success: true,
      message: "Paper deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting paper:", err);
    res.status(500).json({
      success: false,
      message: "Server error while deleting paper",
    });
  }
};

/**
 * Download/generate PDF for a paper.
 * Route: GET /papers/:paperId/download?answers=true&explanations=true&type=WITH_ANSWERS
 * This uses pdf-lib to assemble a simple PDF and apply watermark.
 * NOTE: For production, you'd store generated PDF into Material (S3/local FS) and return fileId or a signed url.
 */
exports.downloadPaperPdf = async (req, res) => {
  try {
    const { paperId } = req.params;
    const includeAnswers = req.query.answers === "true";
    const includeExplanations = req.query.explanations === "true";
    const userId = req.user && req.user._id;

    const paper = await Paper.findById(paperId).populate("items.mcqId").lean();
    if (!paper)
      return res.status(404).json({ success: false, error: "Paper not found" });

    // Build PDF
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - margin;

    // Title
    page.drawText(paper.title || "Paper", {
      x: margin,
      y: y,
      size: 18,
      font: timesRomanFont,
    });
    y -= 30;

    // For each item
    for (const item of paper.items) {
      const mcq = item.mcqId;
      const qText = (mcq.question && mcq.question.text) || "";
      page.drawText(`${item.order || "?"}. ${qText}`, {
        x: margin,
        y: y,
        size: 11,
        font: timesRomanFont,
        maxWidth: width - margin * 2,
      });
      y -= 18;

      // options
      mcq.options.forEach((opt, idx) => {
        let optText = `   ${String.fromCharCode(65 + idx)}. ${opt.label || ""}`;
        if (includeAnswers && opt.isCorrect) {
          // bold representation - use same font but add marker
          optText += "  [ANSWER]";
        }
        page.drawText(optText, {
          x: margin + 8,
          y: y,
          size: 10,
          font: timesRomanFont,
          maxWidth: width - margin * 2,
        });
        y -= 14;
      });

      if (includeExplanations && mcq.explanation) {
        page.drawText(`   Explanation: ${mcq.explanation}`, {
          x: margin + 8,
          y: y,
          size: 9,
          font: timesRomanFont,
          maxWidth: width - margin * 2,
        });
        y -= 14;
      }

      y -= 8;
      if (y < margin + 80) {
        page.addPage();
        y = height - margin;
      }
    }

    // Watermark on every page (simple diagonal)
    const pages = pdfDoc.getPages();
    pages.forEach((pg) => {
      pg.drawText("KRISHNA SCHOOL GROUP", {
        x: 100,
        y: 200,
        size: 40,
        font: timesRomanFont,
        color: rgb(0.8, 0.8, 0.8),
        rotate: { type: "degrees", angle: -30 },
        opacity: 0.25,
      });
    });

    const pdfBytes = await pdfDoc.save();

    // Send as download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${paper.title || "paper"}.pdf"`
    );
    return res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("downloadPaperPdf error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
};
