const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/studentsController");

// optional: attach auth middleware as needed
router.post("/", ctrl.create);
router.get("/", ctrl.list);
router.post("/login", ctrl.login);
router.get("/export", ctrl.export);
router.get("/:id", ctrl.getById);
router.put("/:id", ctrl.update);
router.delete("/by-standard/:standardId/hard", ctrl.hardDeleteByStandard);
router.delete("/:id/hard", ctrl.hardDelete);
router.post("/:id/send-otp", ctrl.sendOtp);
router.post("/verify-otp", ctrl.verifyOtp);
router.put("/:id/change-password", ctrl.changePassword);

module.exports = router;
