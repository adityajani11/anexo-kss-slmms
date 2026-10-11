const mongoose = require("mongoose");
const { Schema } = mongoose;
const softDeletePlugin = require("./plugins/softDelete");

const subjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

subjectSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("Subject", subjectSchema);
