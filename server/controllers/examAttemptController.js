const ExamAttempt = require("../models/ExamAttempt");
const Paper = require("../models/Paper");
const MCQ = require("../models/MCQ");

/* ======================================================
   POST /api/v1/examattempts/submit
   Body: { studentId, paperId, responses, timeTakenSeconds }
====================================================== */
exports.submitExamAttempt = async (req, res) => {
  try {
    const { studentId, paperId, responses, timeTakenSeconds } = req.body;

    if (!studentId || !paperId || !responses?.length) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // fetch paper & its mcqs
    const paper = await Paper.findById(paperId).populate("items.mcqId").lean();
    if (!paper)
      return res
        .status(404)
        .json({ success: false, message: "Paper not found" });

    const mcqMap = new Map();
    paper.items.forEach((i) => {
      if (i.mcqId) mcqMap.set(i.mcqId._id.toString(), i.mcqId);
    });

    let total = 0;
    let max = paper.items.reduce((sum, i) => sum + (i.marks || 1), 0);

    const gradedResponses = responses.map((r) => {
      const mcq = mcqMap.get(r.mcqId);
      if (!mcq)
        return {
          mcqId: r.mcqId,
          selectedIndex: r.selectedIndex,
          correct: false,
          marksAwarded: 0,
        };

      const correctIndex = mcq.options.findIndex((o) => o.isCorrect);
      const isCorrect = correctIndex === r.selectedIndex;
      const marks = isCorrect ? 1 : 0;

      total += marks;

      return {
        mcqId: r.mcqId,
        selectedIndex: r.selectedIndex,
        correct: isCorrect,
        marksAwarded: marks,
      };
    });

    const attempt = await ExamAttempt.create({
      studentId,
      paperId,
      standardId: paper.standardId,
      subjectIds: paper.subjectIds,
      startedAt: new Date(Date.now() - timeTakenSeconds * 1000),
      submittedAt: new Date(),
      responses: gradedResponses,
      score: { total, max },
    });

    res.json({
      success: true,
      message: "Exam attempt recorded successfully",
      data: {
        attemptId: attempt._id,
        correctCount: total,
        totalQuestions: paper.items.length,
        scorePercent: Math.round((total / max) * 100),
        timeTaken: timeTakenSeconds,
      },
    });
  } catch (err) {
    console.error("Error submitting exam attempt:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error while submitting exam" });
  }
};

/* ======================================================
   GET /api/v1/examattempts/history?studentId=
   Fetch all past exam attempts for a student
====================================================== */
exports.getExamHistory = async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId)
      return res
        .status(400)
        .json({ success: false, message: "studentId required" });

    const history = await ExamAttempt.find({ studentId })
      .populate("paperId", "title totalMarks")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: history });
  } catch (err) {
    console.error("Error fetching exam history:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error while fetching history" });
  }
};

/* ---------- DELETE SPECIFIC ATTEMPT ---------- */
exports.deleteExamAttempt = async (req, res) => {
  try {
    const { attemptId, studentId } = req.params;

    const attempt = await ExamAttempt.findOne({
      _id: attemptId,
      studentId,
    });

    if (!attempt)
      return res
        .status(404)
        .json({ success: false, message: "Attempt not found or not yours" });

    await ExamAttempt.deleteOne({ _id: attemptId });

    res.json({
      success: true,
      message: "Attempt deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting attempt:", err);
    res.status(500).json({
      success: false,
      message: "Server error while deleting attempt",
    });
  }
};

/* ---------- DELETE ALL ATTEMPTS FOR A PAPER ---------- */
exports.deletePaperAttempts = async (req, res) => {
  try {
    const { paperId, studentId } = req.params;

    const result = await ExamAttempt.deleteMany({ paperId, studentId });

    res.json({
      success: true,
      message: `${result.deletedCount} attempt(s) deleted successfully`,
    });
  } catch (err) {
    console.error("Error deleting paper attempts:", err);
    res.status(500).json({
      success: false,
      message: "Server error while deleting paper attempts",
    });
  }
};

// GET ALL EXAM ATTEMPT DETAIL
exports.getExamAttemptDetail = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ExamAttempt.findById(attemptId)
      .populate("paperId", "title totalMarks")
      .lean();

    if (!attempt) {
      return res
        .status(404)
        .json({ success: false, message: "Attempt not found" });
    }

    // Fetch MCQ snapshots
    const mcqIds = attempt.responses.map((r) => r.mcqId);
    const mcqs = await MCQ.find({ _id: { $in: mcqIds } }).lean();

    // Merge MCQ details + student responses
    const merged = attempt.responses.map((r) => {
      const mcq = mcqs.find((m) => m._id.toString() === r.mcqId.toString());
      return {
        ...mcq,
        selectedIndex: r.selectedIndex,
        correct: r.correct,
        marksAwarded: r.marksAwarded,
      };
    });

    res.json({
      success: true,
      data: {
        attempt,
        mcqs: merged,
      },
    });
  } catch (err) {
    console.error("Error fetching exam attempt detail:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
