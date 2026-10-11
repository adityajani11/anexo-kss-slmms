const mongoose = require("mongoose");
const { Schema } = mongoose;
const softDeletePlugin = require("./plugins/softDelete");

const studentSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    schoolName: { type: String, required: true, trim: true },
    standardId: {
      type: Schema.Types.ObjectId,
      ref: "Standard",
      required: true,
      immutable: true,
    },
    stream: {
      type: String,
      enum: ["SCIENCE", "COMMERCE", "ARTS", "OTHER"],
      default: null,
    },
    contactNumber: { type: Number, required: true, trim: true },
    whatsappNumber: { type: Number, required: true, trim: true },
    gender: { type: String, enum: ["Male", "Female"] },
    cast: { type: String, trim: true },
    category: { type: String, enum: ["SC", "ST", "OBC", "OPEN", "OTHER"] },
  },
  { timestamps: true }
);

studentSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("Student", studentSchema);
