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

module.exports = {
  createUser,
  findUserByEmail
};
