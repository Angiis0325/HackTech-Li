const pool = require("../config/db");

async function createFile({ reservationId, uploadedBy, category, file }) {
  const query = `
    INSERT INTO files (
      reservation_id, uploaded_by, category, original_name,
      storage_name, mime_type, size_bytes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, reservation_id, uploaded_by, category, original_name,
      mime_type, size_bytes, created_at;
  `;

  const { rows } = await pool.query(query, [
    reservationId,
    uploadedBy || null,
    category,
    file.originalname,
    file.filename,
    file.mimetype,
    file.size
  ]);
  return rows[0];
}

async function listFilesByReservation(reservationId) {
  const query = `
    SELECT id, reservation_id, uploaded_by, category, original_name,
      mime_type, size_bytes, created_at
    FROM files
    WHERE reservation_id = $1
    ORDER BY created_at DESC;
  `;
  const { rows } = await pool.query(query, [reservationId]);
  return rows;
}

async function getFileById(id) {
  const query = `
    SELECT id, reservation_id, uploaded_by, category, original_name,
      storage_name, mime_type, size_bytes, created_at
    FROM files
    WHERE id = $1
    LIMIT 1;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

module.exports = {
  createFile,
  listFilesByReservation,
  getFileById
};
