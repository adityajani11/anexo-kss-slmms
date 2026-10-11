const mongoose = require("mongoose");
const { Schema } = mongoose;

const standardSchema = new Schema(
  {
    standard: { type: Number, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Standard", standardSchema);
