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

async function listServices() {
  const { rows } = await pool.query(
    `SELECT id, name, description, duration_minutes, is_active, created_at, updated_at
     FROM services ORDER BY id ASC`
  );
  return rows;
}

async function findServiceById(serviceId) {
  const { rows } = await pool.query(
    `SELECT id, name, description, duration_minutes, is_active, created_at, updated_at
     FROM services WHERE id = $1 LIMIT 1`,
    [serviceId]
  );
  return rows[0] || null;
}

async function createService({ name, description, durationMinutes }) {
  const { rows } = await pool.query(
    `INSERT INTO services (name, description, duration_minutes)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, duration_minutes, is_active, created_at, updated_at`,
    [name, description || null, durationMinutes]
  );
  return rows[0];
}

async function updateService(id, { name, description, durationMinutes, isActive }) {
  const { rows } = await pool.query(
    `UPDATE services
     SET name = COALESCE($2, name), description = COALESCE($3, description),
         duration_minutes = COALESCE($4, duration_minutes), is_active = COALESCE($5, is_active),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, description, duration_minutes, is_active, created_at, updated_at`,
    [id, name ?? null, description ?? null, durationMinutes ?? null, isActive ?? null]
  );
  return rows[0] || null;
}

async function deactivateService(id) {
  return updateService(id, { isActive: false });
}

module.exports = {
  listActiveServices,
  listServices,
  findServiceById,
  createService,
  updateService,
  deactivateService
};
