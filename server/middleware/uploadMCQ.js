const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const UPLOAD_DIR = path.join("uploads", "mcq");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// Allow only image files
const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    const err = new Error("Only image files are allowed!");
    err.code = "INVALID_FILE_TYPE";
    return cb(err, false);
  }
  cb(null, true);
};

// Initialize multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 900 * 1024 }, // 900 KB max
});

module.exports = upload;
