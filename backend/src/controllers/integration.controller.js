const {
  getReservationById,
  updateReservationStatusByIntegration
} = require("../repositories/reservation.repository");
const { createAuditLog } = require("../repositories/audit.repository");
const { listChannelsForReservation } = require("../repositories/client.repository");

async function updateReservationFromN8n(req, res, next) {
  try {
    const { id } = req.params;
    const { status, calendarEventId, externalReference, message } = req.body;

    const reservation = await getReservationById(id);
    if (!reservation) {
      return res.status(404).json({
        error: {
          message: "Reservation not found",
          code: "RESERVATION_NOT_FOUND"
        }
      });
    }

    const updated = await updateReservationStatusByIntegration({
      id,
      status,
      calendarEventId,
      externalReference
    });

    await createAuditLog({
      actorType: "integration",
      actorId: "n8n",
      action: "reservation.status.updated",
      entity: "reservation",
      entityId: String(id),
      metadata: {
        source: "n8n",
        status,
        calendarEventId: calendarEventId || null,
        externalReference: externalReference || null,
        message: message || null
      }
    });

    res.json({
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

async function getReservationChannels(req, res, next) {
  try {
    const reservation = await getReservationById(req.params.id);
    if (!reservation) return res.status(404).json({ error: { message: "Reservation not found", code: "RESERVATION_NOT_FOUND" } });
    res.json({ data: await listChannelsForReservation(req.params.id) });
  } catch (error) { next(error); }
}

module.exports = {
  updateReservationFromN8n
  ,getReservationChannels
};
