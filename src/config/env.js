const dotenv = require("dotenv");

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
  n8nWebhookToken: process.env.N8N_WEBHOOK_TOKEN || ""
};

module.exports = env;
