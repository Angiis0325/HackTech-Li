const pool = require("../config/db");

async function revokeToken({ jti, userId, expiresAt }) {
  const query = `
    INSERT INTO token_revocations (jti, user_id, expires_at)
    VALUES ($1, $2, $3)
    ON CONFLICT (jti) DO NOTHING
    RETURNING jti;
  `;

  const { rows } = await pool.query(query, [jti, userId, expiresAt]);
  return rows[0] || null;
}

async function isTokenRevoked(jti) {
  if (!jti) return false;

  const query = `
    SELECT 1 FROM token_revocations
    WHERE jti = $1 AND expires_at > NOW()
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [jti]);
  return rows.length > 0;
}

// Limpieza opcional de tokens ya expirados (se pueden borrar sin riesgo
// porque el propio JWT ya venció, revocado o no). Útil como cron/manual.
async function purgeExpiredRevocations() {
  const { rowCount } = await pool.query("DELETE FROM token_revocations WHERE expires_at <= NOW();");
  return rowCount;
}

module.exports = {
  revokeToken,
  isTokenRevoked,
  purgeExpiredRevocations
};
