const express = require("express");
const router = express.Router();
const {
  registerAdmin,
  loginAdmin,
  updateContact,
  verifyAdditionalPassword,
} = require("../controllers/adminController");

const {
  sendAdminOtp,
  verifyOtpAndUpdatePassword,
  verifyOtpAndUpdateProfile,
} = require("../controllers/otpController");

// Routes
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.put("/update-contact", updateContact);
router.post("/verify-additional-password", verifyAdditionalPassword);

// OTP Flow Routes
router.post("/send-otp", sendAdminOtp);
router.post("/verify-otp-update-password", verifyOtpAndUpdatePassword);
router.post("/verify-otp-update-profile", verifyOtpAndUpdateProfile);

module.exports = router;
