const pool = require("../config/db");

async function createAuditLog({
  actorType,
  actorId = null,
  action,
  entity,
  entityId = null,
  userId = null,
  reservationId = null,
  metadata = {}
}) {
  const query = `
    INSERT INTO operation_logs (actor_type, actor_id, action, entity, entity_id, user_id, reservation_id, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    RETURNING id, actor_type, actor_id, action, entity, entity_id, user_id, reservation_id, metadata, created_at;
  `;

  const { rows } = await pool.query(query, [
    actorType,
    actorId,
    action,
    entity,
    entityId,
    userId,
    reservationId,
    JSON.stringify(metadata)
  ]);

  return rows[0];
}

async function listAuditLogs(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const query = `
    SELECT id, actor_type, actor_id, action, entity, entity_id, user_id, reservation_id, metadata, created_at
    FROM operation_logs
    ORDER BY created_at DESC
    LIMIT $1;
  `;

  const { rows } = await pool.query(query, [safeLimit]);
  return rows;
}

module.exports = {
  createAuditLog,
  listAuditLogs
};
