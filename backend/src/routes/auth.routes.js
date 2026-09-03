const express = require("express");

const validate = require("../middlewares/validate");
const { registerSchema, loginSchema } = require("../schemas/auth.schema");
const { register, login } = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

module.exports = router;
