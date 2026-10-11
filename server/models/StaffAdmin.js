const mongoose = require("mongoose");
const { Schema } = mongoose;

const staffAdminSchema = new Schema(
  {
    role: { type: String, enum: ["staff"], default: "staff" },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["Male", "Female"], required: true },
    isDisabled: { type: Boolean, default: false },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("staffAdmin", staffAdminSchema);
