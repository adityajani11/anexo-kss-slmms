// routes/mcq.js
const express = require("express");
const router = express.Router();

// use memory storage instead of uploadMCQ (disk storage)
const upload = require("../middleware/multerMemory");
const ctrl = require("../controllers/mcqController");
const imageCtrl = require("../controllers/mcqImageController");

// PDF route for filtered MCQs
router.post("/pdf", ctrl.getFilteredMcqPDF);

/* ---------- CREATE MCQ ---------- */
router.post("/", upload.any(), ctrl.createMCQ);

/*router.post(
  "/",
  upload.fields([
    { name: "questionImage", maxCount: 1 },
    { name: "optionImage_0", maxCount: 1 },
    { name: "optionImage_1", maxCount: 1 },
    { name: "optionImage_2", maxCount: 1 },
    { name: "optionImage_3", maxCount: 1 },
  ]),
  ctrl.createMCQ
);
*/

/* ---------- UPDATE MCQ ---------- */
router.put("/:id", upload.any(), ctrl.update);

/*
router.put(
  "/:id",
  upload.fields([
    { name: "questionImage", maxCount: 1 },
    { name: "optionImage_0", maxCount: 1 },
    { name: "optionImage_1", maxCount: 1 },
    { name: "optionImage_2", maxCount: 1 },
    { name: "optionImage_3", maxCount: 1 },
  ]),
  ctrl.update
);
*/
router.get("/image", imageCtrl.getImage);

/* ---------- OTHERS ---------- */
router.get("/", ctrl.list);
router.get("/:id", ctrl.getById);
router.delete("/:id", ctrl.softDelete);
router.post("/:id/restore", ctrl.restore);
router.delete("/:id/hard", ctrl.hardDelete);
router.get("/by-standard/:standardId", ctrl.getByStandard);
router.get("/random/by-standard/:standardId", ctrl.getRandomByStandard);

module.exports = router;
