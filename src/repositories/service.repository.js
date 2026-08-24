const pool = require("../config/db");

async function listActiveServices() {
  const query = `
    SELECT id, name, description, duration_minutes, is_active, created_at, updated_at
    FROM services
    WHERE is_active = TRUE
    ORDER BY id ASC;
  `;

  const { rows } = await pool.query(query);
  return rows;
}

module.exports = {
  listActiveServices
};
