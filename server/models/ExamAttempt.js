const mongoose = require("mongoose");
const { Schema } = mongoose;
const softDeletePlugin = require("./plugins/softDelete");

const examAttemptSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    paperId: { type: Schema.Types.ObjectId, ref: "Paper", required: true },
    standardId: {
      type: Schema.Types.ObjectId,
      ref: "Standard",
      required: true,
    },
    subjectIds: [{ type: Schema.Types.ObjectId, ref: "Subject" }],
    startedAt: { type: Date },
    submittedAt: { type: Date },
    responses: [
      {
        mcqId: { type: Schema.Types.ObjectId, ref: "MCQ" },
        selectedIndex: Number,
        correct: Boolean,
        marksAwarded: Number,
      },
    ],
    score: {
      total: Number,
      max: Number,
    },
  },
  { timestamps: true }
);

examAttemptSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("ExamAttempt", examAttemptSchema);
