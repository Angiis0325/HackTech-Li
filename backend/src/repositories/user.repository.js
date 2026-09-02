const pool = require("../config/db");

async function createUser({ name, email, passwordHash, role }) {
  const query = `
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, LOWER($2), $3, $4)
    RETURNING id, name, email, role, created_at;
  `;

  const { rows } = await pool.query(query, [name, email, passwordHash, role]);
  return rows[0];
}

async function findUserByEmail(email) {
  const query = `
    SELECT id, name, email, password_hash, role, is_active, created_at
    FROM users
    WHERE email = LOWER($1)
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}

async function listUsers() {
  const { rows } = await pool.query("SELECT id, name, email, role, is_active, created_at, updated_at FROM users ORDER BY name ASC");
  return rows;
}

async function findUserById(id) {
  const { rows } = await pool.query("SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = $1 LIMIT 1", [id]);
  return rows[0] || null;
}

async function updateUser(id, { name, email, role, isActive }) {
  const { rows } = await pool.query(
    `UPDATE users SET name = COALESCE($2, name), email = COALESCE(LOWER($3), email),
     role = COALESCE($4, role), is_active = COALESCE($5, is_active), updated_at = NOW()
     WHERE id = $1 RETURNING id, name, email, role, is_active, created_at, updated_at`,
    [id, name ?? null, email ?? null, role ?? null, isActive ?? null]
  );
  return rows[0] || null;
}

module.exports = {
  createUser,
  findUserByEmail
  ,listUsers
  ,findUserById
  ,updateUser
};
