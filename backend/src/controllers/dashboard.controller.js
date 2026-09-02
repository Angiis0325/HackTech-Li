const pool = require("../config/db");

async function getSummary(req, res, next) {
  try {
    const counts = await pool.query("SELECT status, COUNT(*)::integer AS total FROM reservations GROUP BY status");
    const upcoming = await pool.query(
      `SELECT r.id, r.start_time, r.end_time, r.status, c.full_name AS client_name, s.name AS service_name
       FROM reservations r JOIN clients c ON c.id = r.client_id JOIN services s ON s.id = r.service_id
       WHERE r.start_time >= NOW() AND r.status IN ('pending', 'confirmed')
       ORDER BY r.start_time ASC LIMIT 10`
    );
    const today = await pool.query(
      `SELECT COUNT(*)::integer AS total FROM reservations
       WHERE DATE(start_time AT TIME ZONE 'UTC') = CURRENT_DATE
       AND status IN ('pending', 'confirmed')`
    );
    const byStatus = Object.fromEntries(counts.rows.map((row) => [row.status, row.total]));
    res.json({ data: { today: today.rows[0].total, byStatus, upcoming: upcoming.rows } });
  } catch (error) { next(error); }
}

module.exports = { getSummary };
