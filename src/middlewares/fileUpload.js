const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const env = require("../config/env");

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    fs.mkdirSync(env.uploadDir, { recursive: true });
    callback(null, env.uploadDir);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const uploadFiles = multer({
  storage,
  limits: {
    fileSize: env.maxFileSizeBytes,
    files: env.maxFilesPerRequest
  },
  fileFilter: (req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error("Unsupported file type");
      error.status = 400;
      error.code = "UNSUPPORTED_FILE_TYPE";
      return callback(error);
    }

    callback(null, true);
  }
});

module.exports = {
  uploadFiles
};
