const express = require("express");
const router = express.Router();
const examAttemptController = require("../controllers/examAttemptController");

// POST - submit exam attempt
router.post("/submit", examAttemptController.submitExamAttempt);

router.get("/history", examAttemptController.getExamHistory);

// Delete specific attempt
router.delete(
  "/delete/:studentId/:attemptId",
  examAttemptController.deleteExamAttempt
);

// Delete all attempts of a paper
router.delete(
  "/delete-all/:studentId/:paperId",
  examAttemptController.deletePaperAttempts
);

router.get("/attempt/:attemptId", examAttemptController.getExamAttemptDetail);

module.exports = router;
