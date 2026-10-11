const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    phone: { type: String, required: true },
    otp: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["PASSWORD_RESET", "PROFILE_UPDATE"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Otp", otpSchema);
