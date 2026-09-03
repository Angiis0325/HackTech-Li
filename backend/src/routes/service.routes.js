const express = require("express");
const { getActiveServices } = require("../controllers/service.controller");

const router = express.Router();

router.get("/", getActiveServices);

module.exports = router;
