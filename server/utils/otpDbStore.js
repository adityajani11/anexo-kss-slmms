const Otp = require("../models/Otp");

exports.saveOtpDb = async ({ userId, phone, otp, purpose }) => {
  // Delete old OTPs for same user + purpose
  await Otp.deleteMany({ userId, purpose });

  await Otp.create({
    userId,
    phone,
    otp,
    purpose,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });
};

exports.verifyOtpDb = async ({ userId, phone, otp, purpose }) => {
  const record = await Otp.findOne({
    userId,
    phone,
    otp,
    purpose,
  });

  if (!record) return false;
  if (record.expiresAt < new Date()) return false;

  // One-time use
  await Otp.deleteOne({ _id: record._id });
  return true;
};
