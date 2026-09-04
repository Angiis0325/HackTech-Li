const fs = require("fs/promises");
const path = require("path");
const env = require("../config/env");
const { createAuditLog } = require("../repositories/audit.repository");
const {
  createFile,
  listFilesByReservation,
  getFileById
} = require("../repositories/file.repository");
const { getReservationById } = require("../repositories/reservation.repository");

const INTERNAL_CATEGORIES = new Set(["medical_history", "client_attachment"]);
const PUBLIC_CATEGORY = "client_attachment";

function serializeFile(file) {
  return {
    ...file,
    downloadUrl: `/api/files/${file.id}/download`
  };
}

function isReservationOwner(reservation, email) {
  return reservation.client_email?.toLowerCase() === email.trim().toLowerCase();
}

function parseReservationId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function removeUploadedFiles(files) {
  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
}

async function saveUploadedFiles(files, reservationId, uploadedBy, category) {
  const saved = [];
  try {
    for (const file of files) {
      saved.push(await createFile({ reservationId, uploadedBy, category, file }));
    }
    return saved;
  } catch (error) {
    await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
    throw error;
  }
}

async function uploadPublicFiles(req, res, next) {
  const files = req.files || [];
  try {
    const reservationId = parseReservationId(req.body.reservationId);
    const email = typeof req.body.email === "string" ? req.body.email : "";

    if (!reservationId || !email || files.length === 0) {
      await removeUploadedFiles(files);
      return res.status(400).json({
        error: {
          message: "reservationId, email and at least one file are required",
          code: "INVALID_FILE_UPLOAD"
        }
      });
    }

    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      await removeUploadedFiles(files);
      return res.status(404).json({
        error: { message: "Reservation not found", code: "RESERVATION_NOT_FOUND" }
      });
    }

    if (!isReservationOwner(reservation, email)) {
      await removeUploadedFiles(files);
      return res.status(403).json({
        error: { message: "Email does not match this reservation", code: "EMAIL_MISMATCH" }
      });
    }

    const uploaded = await saveUploadedFiles(files, reservationId, null, PUBLIC_CATEGORY);
    await createAuditLog({
      actorType: "public",
      actorId: email,
      action: "file.uploaded",
      entity: "reservation",
      entityId: String(reservationId),
      metadata: { category: PUBLIC_CATEGORY, count: uploaded.length }
    });

    res.status(201).json({ data: uploaded.map(serializeFile) });
  } catch (error) {
    next(error);
  }
}

async function uploadInternalFiles(req, res, next) {
  const files = req.files || [];
  try {
    const reservationId = parseReservationId(req.params.reservationId);
    const category = req.body.category || "medical_history";

    if (!reservationId || files.length === 0 || !INTERNAL_CATEGORIES.has(category)) {
      await removeUploadedFiles(files);
      return res.status(400).json({
        error: {
          message: "A valid category and at least one file are required",
          code: "INVALID_FILE_UPLOAD"
        }
      });
    }

    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      await removeUploadedFiles(files);
      return res.status(404).json({
        error: { message: "Reservation not found", code: "RESERVATION_NOT_FOUND" }
      });
    }

    const uploaded = await saveUploadedFiles(files, reservationId, req.user.sub, category);
    await createAuditLog({
      actorType: "user",
      actorId: String(req.user.sub),
      action: "file.uploaded",
      entity: "reservation",
      entityId: String(reservationId),
      metadata: { category, count: uploaded.length }
    });

    res.status(201).json({ data: uploaded.map(serializeFile) });
  } catch (error) {
    next(error);
  }
}

async function listReservationFiles(req, res, next) {
  try {
    const reservationId = parseReservationId(req.params.reservationId);
    if (!reservationId) {
      return res.status(400).json({ error: { message: "Invalid reservation id", code: "VALIDATION_ERROR" } });
    }

    const reservation = await getReservationById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: { message: "Reservation not found", code: "RESERVATION_NOT_FOUND" } });
    }

    const files = await listFilesByReservation(reservationId);
    res.json({ data: files.map(serializeFile) });
  } catch (error) {
    next(error);
  }
}

async function downloadFile(req, res, next) {
  try {
    const file = await getFileById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: { message: "File not found", code: "FILE_NOT_FOUND" } });
    }

    const filePath = path.join(env.uploadDir, file.storage_name);
    res.download(filePath, file.original_name, { headers: { "Content-Type": file.mime_type } }, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadPublicFiles,
  uploadInternalFiles,
  listReservationFiles,
  downloadFile
};
