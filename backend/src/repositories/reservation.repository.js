const pool = require("../config/db");

async function findServiceById(serviceId) {
  const { rows } = await pool.query(
    "SELECT id, name, duration_minutes, is_active FROM services WHERE id = $1 LIMIT 1",
    [serviceId]
  );
  return rows[0] || null;
}

async function upsertClient(client) {
  const query = `
    INSERT INTO clients (full_name, email, phone)
    VALUES ($1, LOWER($2), $3)
    ON CONFLICT (email)
    DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, updated_at = NOW()
    RETURNING id, full_name, email, phone;
  `;

  const { rows } = await pool.query(query, [client.fullName, client.email, client.phone]);
  return rows[0];
}

async function hasOverlap(startTime, endTime, excludeReservationId = null) {
  const values = [startTime, endTime];
  const exclusion = excludeReservationId ? "AND id <> $3" : "";
  if (excludeReservationId) values.push(excludeReservationId);
  const query = `
    SELECT 1
    FROM reservations
    WHERE status IN ('pending', 'confirmed')
      AND NOT (end_time <= $1::timestamptz OR start_time >= $2::timestamptz)
      ${exclusion}
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, values);
  return rows.length > 0;
}

async function listBusyIntervals({ from, to }) {
  const query = `
    SELECT start_time, end_time
    FROM reservations
    WHERE status IN ('pending', 'confirmed')
      AND NOT (end_time <= $1::timestamptz OR start_time >= $2::timestamptz)
    ORDER BY start_time ASC;
  `;

  const { rows } = await pool.query(query, [from, to]);
  return rows;
}

async function createReservation({ clientId, serviceId, startTime, endTime, notes, source = "web" }) {
  const client = await pool.connect();
  const query = `
    INSERT INTO reservations (client_id, service_id, start_time, end_time, status, source, notes)
    VALUES ($1, $2, $3::timestamptz, $4::timestamptz, 'pending', $5, $6)
    RETURNING id, client_id, service_id, start_time, end_time, status, source, notes, created_at;
  `;

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [987654321]);
    const overlap = await client.query(
      `SELECT 1 FROM reservations WHERE status IN ('pending', 'confirmed')
       AND NOT (end_time <= $1::timestamptz OR start_time >= $2::timestamptz) LIMIT 1`,
      [startTime, endTime]
    );
    if (overlap.rowCount > 0) {
      const error = new Error("Selected schedule is not available");
      error.status = 409;
      error.code = "SLOT_UNAVAILABLE";
      throw error;
    }
    const { rows } = await client.query(query, [clientId, serviceId, startTime, endTime, source, notes || null]);
    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listReservations({ date, status }) {
  const values = [];
  const where = [];

  if (date) {
    values.push(date);
    where.push(`DATE(r.start_time AT TIME ZONE 'UTC') = $${values.length}`);
  }

  if (status) {
    values.push(status);
    where.push(`r.status = $${values.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const query = `
    SELECT
      r.id,
      r.start_time,
      r.end_time,
      r.status,
      r.source,
      r.notes,
      r.created_at,
      c.full_name AS client_name,
      c.email AS client_email,
      c.phone AS client_phone,
      s.name AS service_name,
      s.duration_minutes
    FROM reservations r
    JOIN clients c ON c.id = r.client_id
    JOIN services s ON s.id = r.service_id
    ${whereClause}
    ORDER BY r.start_time ASC;
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}

async function getReservationById(id) {
  const query = `
    SELECT
      r.id,
      r.start_time,
      r.end_time,
      r.status,
      r.source,
      r.notes,
      r.created_at,
      c.full_name AS client_name,
      c.email AS client_email,
      c.phone AS client_phone,
      s.name AS service_name,
      s.duration_minutes
    FROM reservations r
    JOIN clients c ON c.id = r.client_id
    JOIN services s ON s.id = r.service_id
    WHERE r.id = $1
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function updateReservationStatus(id, status) {
  const query = `
    UPDATE reservations
    SET status = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, status, updated_at;
  `;

  const { rows } = await pool.query(query, [id, status]);
  return rows[0] || null;
}

async function updateReservationSchedule(id, startTime, endTime) {
  const query = `
    UPDATE reservations
    SET start_time = $2::timestamptz,
        end_time = $3::timestamptz,
        status = 'pending',
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, client_id, service_id, start_time, end_time, status, source, notes, updated_at;
  `;

  const { rows } = await pool.query(query, [id, startTime, endTime]);
  return rows[0] || null;
}

async function updateReservationStatusByIntegration({
  id,
  status,
  calendarEventId,
  externalReference
}) {
  const query = `
    UPDATE reservations
    SET status = $2,
        calendar_event_id = COALESCE($3, calendar_event_id),
        external_reference = COALESCE($4, external_reference),
        synced_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, status, calendar_event_id, external_reference, synced_at, updated_at;
  `;

  const { rows } = await pool.query(query, [id, status, calendarEventId || null, externalReference || null]);
  return rows[0] || null;
}

module.exports = {
  findServiceById,
  upsertClient,
  hasOverlap,
  listBusyIntervals,
  createReservation,
  listReservations,
  getReservationById,
  updateReservationStatus,
  updateReservationSchedule,
  updateReservationStatusByIntegration
};
