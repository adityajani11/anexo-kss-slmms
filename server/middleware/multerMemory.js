// server/middleware/multerMemory.js
const multer = require("multer");

// memory storage so we get file.buffer
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB adjust as needed
  },
});

module.exports = upload;
