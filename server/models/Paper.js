const mongoose = require("mongoose");
const { Schema } = mongoose;
const softDeletePlugin = require("./plugins/softDelete");

const paperSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["STAFF_DRAFT", "STUDENT_DRAFT", "GENERATED"],
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      refPath: "createdByModel",
      required: true,
    },
    createdByModel: {
      type: String,
      enum: ["Student", "staffAdmin"],
      required: true,
    },
    standardId: {
      type: Schema.Types.ObjectId,
      ref: "Standard",
      required: true,
    },
    subjectIds: [{ type: Schema.Types.ObjectId, ref: "Subject" }],
    includeAnswers: { type: Boolean, default: false },
    includeExplanations: { type: Boolean, default: false },
    totalMarks: { type: Number, max: 120 },
    items: [
      {
        mcqId: { type: Schema.Types.ObjectId, ref: "MCQ" },
        marks: Number,
        order: Number,
      },
    ],
    parentPaperId: { type: Schema.Types.ObjectId, ref: "Paper" },
    generatedPdf: {
      fileId: { type: Schema.Types.ObjectId, ref: "Material" },
      at: Date,
    },
  },
  { timestamps: true }
);

paperSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("Paper", paperSchema);
