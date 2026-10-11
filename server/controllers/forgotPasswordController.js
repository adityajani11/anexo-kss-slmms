const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const Staff = require("../models/StaffAdmin");
const Student = require("../models/Student");
const axios = require("axios");
const bcrypt = require("bcryptjs");

const OTP = {}; // In-memory store (use Redis in production)

// WhatsApp OTP function
const { saveOtpDb, verifyOtpDb } = require("../utils/otpDbStore");
// ======================================================
// 1) REQUEST OTP
// ======================================================
exports.requestForgotPasswordOtp = async (req, res) => {
  const { role, username, contactNumber } = req.body;

  try {
    let user;

    if (role === "admin")
      user = await Admin.findOne({ username, contactNumber });

    if (role === "staff")
      user = await Staff.findOne({ username, contactNumber });

    if (role === "student")
      user = await Student.findOne({ username, contactNumber });

    if (!user) {
      return res.status(404).json({
        message: "No user found with this username & contact number.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to DB
    await saveOtpDb({
      userId: user._id,
      phone: contactNumber,
      otp,
      purpose: "PASSWORD_RESET",
    });

    // WhatsApp Template JSON — SAME AS YOUR STAFF PASSWORD CHANGE API
    const templateJson = {
      to: contactNumber,
      recipient_type: "individual",
      type: "template",
      template: {
        language: {
          policy: "deterministic",
          code: "en",
        },
        name: "send_otp_message",
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: otp,
              },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: 0,
            parameters: [
              {
                type: "text",
                text: otp,
              },
            ],
          },
        ],
      },
    };

    // Send via WhatsApp API
    await axios.post(process.env.WHATSAPP_API_URL, templateJson, {
      headers: {
        Authorization: `Bearer ${process.env.WHATAPI_TOKEN}`,
      },
    });

    return res.json({
      success: true,
      message: "OTP sent to WhatsApp successfully",
    });
  } catch (err) {
    console.error("Forgot Password OTP Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// ======================================================
// 2) VERIFY OTP
// ======================================================
exports.verifyForgotPasswordOtp = async (req, res) => {
  const { role, username, otp } = req.body;

  try {
    let user;

    if (role === "admin") user = await Admin.findOne({ username });
    if (role === "staff") user = await Staff.findOne({ username });
    if (role === "student") user = await Student.findOne({ username });

    if (!user) return res.status(404).json({ message: "User not found" });

    const isValid = await verifyOtpDb({
      userId: user._id,
      phone: user.contactNumber,
      otp,
      purpose: "PASSWORD_RESET",
    });

    if (!isValid)
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });

    return res.json({
      success: true,
      message: "OTP verified",
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ======================================================
// 3) RESET PASSWORD
// ======================================================
exports.resetPassword = async (req, res) => {
  try {
    const { role, username, newPassword } = req.body;

    const models = { admin: Admin, staff: Staff, student: Student };
    const Model = models[role];

    if (!Model) return res.status(400).json({ message: "Invalid role" });

    const user = await Model.findOne({ username });

    if (!user) return res.status(404).json({ message: "User not found" });

    const hash = await bcrypt.hash(newPassword, 10);

    if ("password" in user) user.password = hash;
    if ("passwordHash" in user) user.passwordHash = hash;

    await user.save();

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
