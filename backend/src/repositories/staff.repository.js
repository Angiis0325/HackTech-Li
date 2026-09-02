const pool = require("../config/db");

// Lista de todo el personal (admin/staff), independiente de user.repository.js
// (ese archivo solo tiene lookups por email/creación para auth). Este es
// para el panel admin de gestión de staff <-> servicios.
async function listStaffUsers() {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, is_active, created_at
     FROM users
     WHERE is_active = TRUE
     ORDER BY name ASC`
  );
  return rows;
}

async function findUserById(userId) {
  const { rows } = await pool.query(
    "SELECT id, name, email, role, is_active FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  return rows[0] || null;
}

async function assignServiceToUser(userId, serviceId) {
  const query = `
    INSERT INTO user_services (user_id, service_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, service_id) DO NOTHING
    RETURNING user_id, service_id, created_at;
  `;
  const { rows } = await pool.query(query, [userId, serviceId]);
  return rows[0] || null;
}

async function unassignServiceFromUser(userId, serviceId) {
  const { rowCount } = await pool.query(
    "DELETE FROM user_services WHERE user_id = $1 AND service_id = $2",
    [userId, serviceId]
  );
  return rowCount > 0;
}

async function listServicesForUser(userId) {
  const query = `
    SELECT s.id, s.name, s.duration_minutes, s.is_active
    FROM user_services us
    JOIN services s ON s.id = us.service_id
    WHERE us.user_id = $1
    ORDER BY s.name ASC;
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows;
}

async function listStaffForService(serviceId) {
  const query = `
    SELECT u.id, u.name, u.email
    FROM user_services us
    JOIN users u ON u.id = us.user_id
    WHERE us.service_id = $1 AND u.is_active = TRUE
    ORDER BY u.name ASC;
  `;
  const { rows } = await pool.query(query, [serviceId]);
  return rows;
}

async function isUserAssignedToService(userId, serviceId) {
  const { rows } = await pool.query(
    "SELECT 1 FROM user_services WHERE user_id = $1 AND service_id = $2 LIMIT 1",
    [userId, serviceId]
  );
  return rows.length > 0;
}

module.exports = {
  listStaffUsers,
  findUserById,
  assignServiceToUser,
  unassignServiceFromUser,
  listServicesForUser,
  listStaffForService,
  isUserAssignedToService
};
