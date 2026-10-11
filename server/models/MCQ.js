const mongoose = require("mongoose");
const { Schema } = mongoose;

const mcqSchema = new Schema(
  {
    standardId: {
      type: Schema.Types.ObjectId,
      ref: "Standard",
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    question: {
      text: { type: String, required: true, trim: true },
      image: { type: String, default: null },
      language: { type: String, enum: ["gu", "en"], default: "gu" },
      font: {
        type: String,
        enum: ["Nilkanth", "HareKrishna", "Default"],
        default: "Default",
      },
    },
    options: [
      {
        label: { type: String, trim: true },
        image: { type: String, default: null },
        isCorrect: { type: Boolean, required: true },
      },
    ],
    explanation: {
	text: { type: String, trim: true },
	image: { type: String, default: null },
	},
    createdBy: { type: Schema.Types.ObjectId, ref: "staffAdmin" },
  },
  { timestamps: true }
);

mcqSchema.pre("save", function (next) {
  const correctOptions = this.options.filter((o) => o.isCorrect);
  if (correctOptions.length !== 1) {
    return next(new Error("Exactly one option must be marked as correct."));
  }
  next();
});

module.exports = mongoose.model("MCQ", mcqSchema);
