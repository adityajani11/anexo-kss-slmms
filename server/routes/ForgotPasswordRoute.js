const express = require("express");
const router = express.Router();
const {
  requestForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
} = require("../controllers/forgotPasswordController");

router.post("/request", requestForgotPasswordOtp);
router.post("/verify", verifyForgotPasswordOtp);
router.post("/reset-password", resetPassword);

module.exports = router;
