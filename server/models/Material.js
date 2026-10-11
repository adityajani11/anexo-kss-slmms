const mongoose = require("mongoose");
const { Schema } = mongoose;

const materialSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    path: {
      type: String,
      required: function () {
        return this.isNew; // required only when creating a new Material
      },
      trim: true,
    },

    // File info (PDF stored in local FS or AWS)
    file: {
      storage: {
        type: String,
        enum: ["fs", "aws"],
        default: "fs",
      },
      fileId: {
        type: String, // path or S3 key
        required: false,
      },
      size: Number, // file size in bytes
      mime: {
        type: String,
        default: "application/pdf",
      },
    },
    standardId: {
      type: Schema.Types.ObjectId,
      ref: "Standard",
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      refPath: "uploadedByModel",
    },
    uploadedByModel: {
      type: String,
      enum: ["student", "staffadmin"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Material", materialSchema);
