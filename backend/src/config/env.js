const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  adminInviteCode: process.env.ADMIN_INVITE_CODE || "",
  n8nWebhookToken: process.env.N8N_WEBHOOK_TOKEN || "",
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "private")),
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024),
  maxFilesPerRequest: Number(process.env.MAX_FILES_PER_REQUEST || 5)
};

module.exports = env;
