const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const db = await pool.query("SELECT NOW() AS db_time");

    res.json({
      data: {
        status: "ok",
        uptimeSeconds: process.uptime(),
        dbTime: db.rows[0].db_time
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
