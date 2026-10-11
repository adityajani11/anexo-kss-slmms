// routes/material.js
const express = require("express");
const router = express.Router();

const upload = require("../middleware/multerMemory"); // memory upload
const ctrl = require("../controllers/materialController");

// Upload new material (PDF)
router.post("/", upload.single("file"), ctrl.create);

// Get list of materials
router.get("/", ctrl.list);

// Stream PDF from S3
router.get("/:id", ctrl.getPdf);

// Download PDF from S3
router.get("/:id/download", ctrl.downloadPdf);

// Delete from S3 + DB
router.delete("/:id/hard", ctrl.hardDelete);

// Get materials by standard
router.get("/by-standard/:standardId", ctrl.getByStandard);

module.exports = router;
