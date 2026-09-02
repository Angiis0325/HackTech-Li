const express = require("express");
const { requireAuth, authorizeRoles } = require("../middlewares/auth");
const { getSummary } = require("../controllers/dashboard.controller");

const router = express.Router();
router.get("/summary", requireAuth, authorizeRoles("admin", "staff"), getSummary);

module.exports = router;
