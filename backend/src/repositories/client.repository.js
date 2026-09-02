const pool = require("../config/db");

// Registro público/administrativo: crea SOLO si el email no existe todavía.
// A diferencia del upsert anterior, si el email ya existe lanza un error
// de violación de UNIQUE (código 23505) que el controlador traduce a 409.
async function createClient({ fullName, email, phone }) {
  const query = `
    INSERT INTO clients (full_name, email, phone)
    VALUES ($1, LOWER($2), $3)
    RETURNING id, full_name, email, phone, created_at;
  `;

  const { rows } = await pool.query(query, [fullName, email, phone]);
  return rows[0];
}

async function findClientById(clientId) {
  const { rows } = await pool.query(
    "SELECT id, full_name, email, phone, created_at FROM clients WHERE id = $1 LIMIT 1",
    [clientId]
  );
  return rows[0] || null;
}

async function findClientByEmail(email) {
  const { rows } = await pool.query(
    "SELECT id, full_name, email, phone, created_at FROM clients WHERE email = LOWER($1) LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

async function listClients() {
  const { rows } = await pool.query(
    "SELECT id, full_name, email, phone, created_at FROM clients ORDER BY created_at DESC"
  );
  return rows;
}

async function updateClient(id, { fullName, email, phone }) {
  const { rows } = await pool.query(
    `UPDATE clients SET full_name = COALESCE($2, full_name), email = COALESCE(LOWER($3), email),
     phone = COALESCE($4, phone), updated_at = NOW() WHERE id = $1
     RETURNING id, full_name, email, phone, created_at, updated_at`,
    [id, fullName ?? null, email ?? null, phone ?? null]
  );
  return rows[0] || null;
}

async function deleteClient(id) {
  const { rowCount } = await pool.query("DELETE FROM clients WHERE id = $1", [id]);
  return rowCount > 0;
}

// --- client_channels: canales de notificación del cliente ---
// Soporta múltiples canales (email/telegram/sms) por cliente, para que
// n8n sepa por dónde enviar confirmaciones/recordatorios.
async function addClientChannel({ clientId, channelType, channelValue, isPrimary = false }) {
  const query = `
    INSERT INTO client_channels (client_id, channel_type, channel_value, is_primary)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (client_id, channel_type, channel_value)
    DO UPDATE SET is_primary = EXCLUDED.is_primary, updated_at = NOW()
    RETURNING id, client_id, channel_type, channel_value, is_primary, verified_at, created_at;
  `;
  const { rows } = await pool.query(query, [clientId, channelType, channelValue, isPrimary]);
  return rows[0];
}

async function listClientChannels(clientId) {
  const { rows } = await pool.query(
    `SELECT id, client_id, channel_type, channel_value, is_primary, verified_at, created_at
     FROM client_channels
     WHERE client_id = $1
     ORDER BY is_primary DESC, created_at ASC`,
    [clientId]
  );
  return rows;
}

async function listChannelsForReservation(reservationId) {
  const { rows } = await pool.query(
    `SELECT cc.id, cc.client_id, cc.channel_type, cc.channel_value, cc.is_primary, cc.verified_at
     FROM client_channels cc JOIN reservations r ON r.client_id = cc.client_id
     WHERE r.id = $1 ORDER BY cc.is_primary DESC, cc.created_at ASC`,
    [reservationId]
  );
  return rows;
}

async function removeClientChannel(clientId, channelId) {
  const { rowCount } = await pool.query(
    "DELETE FROM client_channels WHERE id = $1 AND client_id = $2",
    [channelId, clientId]
  );
  return rowCount > 0;
}

module.exports = {
  createClient,
  findClientById,
  findClientByEmail,
  listClients,
  updateClient,
  deleteClient,
  addClientChannel,
  listClientChannels,
  listChannelsForReservation,
  removeClientChannel
};
