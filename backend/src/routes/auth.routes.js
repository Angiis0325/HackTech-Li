const express = require("express");

const validate = require("../middlewares/validate");
const { registerSchema, loginSchema } = require("../schemas/auth.schema");
const { requireAuth } = require("../middlewares/auth");
const { loginLimiter } = require("../middlewares/rateLimit");
const { register, login, logout } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/logout", requireAuth, logout);

module.exports = router;
