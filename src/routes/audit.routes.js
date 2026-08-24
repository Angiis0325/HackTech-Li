const express = require("express");

const { requireAuth, authorizeRoles } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { listAuditLogsSchema } = require("../schemas/audit.schema");
const { getAuditLogs } = require("../controllers/audit.controller");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  authorizeRoles("admin", "staff"),
  validate(listAuditLogsSchema),
  getAuditLogs
);

module.exports = router;
