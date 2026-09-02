const {
  findServiceById,
  hasOverlap,
  listBusyIntervals,
  createReservation,
  listReservations,
  getReservationById,
  updateReservationStatus,
  updateReservationSchedule
} = require("../repositories/reservation.repository");
const { findClientById: findClient } = require("../repositories/client.repository");
const { createAuditLog } = require("../repositories/audit.repository");
const { buildAvailableSlots } = require("../utils/availability");
const env = require("../config/env");

async function notifyN8n(reservation) {
  if (!env.n8nWebhookUrl) return;
  try {
    await fetch(env.n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-integration-token": env.n8nWebhookToken },
      body: JSON.stringify({ event: "reservation.created", reservation })
    });
  } catch (error) {
    if (env.nodeEnv !== "test") console.error("n8n notification failed:", error.message);
  }
}

async function createPublicReservation(req, res, next) {
  try {
    const { clientId, serviceId, startTime, endTime, notes } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start <= new Date()) {
      return res.status(400).json({
        error: { message: "startTime must be in the future", code: "INVALID_TIME_RANGE" }
      });
    }

    if (end <= start) {
      return res.status(400).json({
        error: {
          message: "endTime must be greater than startTime",
          code: "INVALID_TIME_RANGE"
        }
      });
    }

    const service = await findServiceById(serviceId);
    if (!service || !service.is_active) {
      return res.status(404).json({
        error: {
          message: "Service not found or inactive",
          code: "SERVICE_NOT_FOUND"
        }
      });
    }

    const client = await findClient(clientId);
    if (!client) {
      return res.status(404).json({
        error: { message: "Client not found", code: "CLIENT_NOT_FOUND" }
      });
    }

    const overlap = await hasOverlap(startTime, endTime);
    if (overlap) {
      return res.status(409).json({
        error: {
          message: "Selected schedule is not available",
          code: "SLOT_UNAVAILABLE"
        }
      });
    }

    const reservation = await createReservation({
      clientId,
      serviceId,
      startTime,
      endTime,
      notes,
      source: "web"
    });

    await createAuditLog({
      actorType: "public",
      actorId: client.email,
      action: "reservation.created",
      entity: "reservation",
      entityId: String(reservation.id),
      metadata: {
        serviceId,
        startTime,
        endTime,
        source: "web"
      }
    });
    await notifyN8n(reservation);

    res.status(201).json({
      data: {
        reservation,
        client,
        service: {
          id: service.id,
          name: service.name,
          durationMinutes: service.duration_minutes
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

async function reschedulePublicReservation(req, res, next) {
  try {
    const { id } = req.params;
    const { email, startTime, endTime } = req.body;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const reservation = await getReservationById(id);

    if (!reservation) {
      return res.status(404).json({ error: { message: "Reservation not found", code: "RESERVATION_NOT_FOUND" } });
    }
    if (reservation.client_email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: { message: "Email does not match reservation client", code: "EMAIL_MISMATCH" } });
    }
    if (end <= start) {
      return res.status(400).json({ error: { message: "endTime must be greater than startTime", code: "INVALID_TIME_RANGE" } });
    }
    if (reservation.status !== "pending" && reservation.status !== "confirmed") {
      return res.status(409).json({ error: { message: "Reservation is not active", code: "RESERVATION_NOT_ACTIVE" } });
    }
    if (await hasOverlap(startTime, endTime, id)) {
      return res.status(409).json({ error: { message: "Selected schedule is not available", code: "SLOT_UNAVAILABLE" } });
    }

    const updated = await updateReservationSchedule(id, startTime, endTime);
    await createAuditLog({
      actorType: "public",
      actorId: reservation.client_email,
      action: "reservation.rescheduled",
      entity: "reservation",
      entityId: String(id),
      metadata: { startTime, endTime, source: "public_api" }
    });
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

async function cancelPublicReservation(req, res, next) {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const reservation = await getReservationById(id);

    if (!reservation) {
      return res.status(404).json({ error: { message: "Reservation not found", code: "RESERVATION_NOT_FOUND" } });
    }
    if (reservation.client_email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: { message: "Email does not match reservation client", code: "EMAIL_MISMATCH" } });
    }
    if (reservation.status !== "pending" && reservation.status !== "confirmed") {
      return res.status(409).json({
        error: { message: "Reservation is not active", code: "RESERVATION_NOT_ACTIVE" }
      });
    }

    const updated = await updateReservationStatus(id, "cancelled");
    await createAuditLog({
      actorType: "public",
      actorId: reservation.client_email,
      action: "reservation.cancelled",
      entity: "reservation",
      entityId: String(id),
      metadata: { source: "public_api" }
    });
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

async function rescheduleReservation(req, res, next) {
  try {
    const { id } = req.params;
    const { startTime, endTime } = req.body;
    const reservation = await getReservationById(id);
    if (!reservation) return res.status(404).json({ error: { message: "Reservation not found", code: "RESERVATION_NOT_FOUND" } });
    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({ error: { message: "endTime must be greater than startTime", code: "INVALID_TIME_RANGE" } });
    }
    if (await hasOverlap(startTime, endTime, id)) {
      return res.status(409).json({ error: { message: "Selected schedule is not available", code: "SLOT_UNAVAILABLE" } });
    }
    const updated = await updateReservationSchedule(id, startTime, endTime);
    await createAuditLog({ actorType: "user", actorId: String(req.user.sub), userId: req.user.sub, action: "reservation.rescheduled", entity: "reservation", entityId: String(id), reservationId: id, metadata: { startTime, endTime } });
    res.json({ data: updated });
  } catch (error) { next(error); }
}

async function getReservations(req, res, next) {
  try {
    const { date, status } = req.query;
    const reservations = await listReservations({ date, status });

    res.json({
      data: reservations
    });
  } catch (error) {
    next(error);
  }
}

async function getReservation(req, res, next) {
  try {
    const reservation = await getReservationById(req.params.id);

    if (!reservation) {
      return res.status(404).json({
        error: {
          message: "Reservation not found",
          code: "RESERVATION_NOT_FOUND"
        }
      });
    }

    res.json({ data: reservation });
  } catch (error) {
    next(error);
  }
}

async function patchReservationStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const reservation = await getReservationById(id);
    if (!reservation) {
      return res.status(404).json({
        error: {
          message: "Reservation not found",
          code: "RESERVATION_NOT_FOUND"
        }
      });
    }

    const updated = await updateReservationStatus(id, status);

    await createAuditLog({
      actorType: "user",
      actorId: req.user ? String(req.user.sub) : null,
      action: "reservation.status.updated",
      entity: "reservation",
      entityId: String(id),
      metadata: {
        fromStatus: reservation.status,
        toStatus: status,
        source: "admin_api"
      }
    });

    res.json({
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

async function getAvailability(req, res, next) {
  try {
    const {
      from,
      to,
      serviceId,
      slotMinutes = 30,
      dayStartHour = 8,
      dayEndHour = 18
    } = req.query;

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (toDate <= fromDate) {
      return res.status(400).json({
        error: {
          message: "to must be greater than from",
          code: "INVALID_TIME_RANGE"
        }
      });
    }

    const daysDiff = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 31) {
      return res.status(400).json({
        error: {
          message: "Maximum availability window is 31 days",
          code: "RANGE_TOO_LARGE"
        }
      });
    }

    if (Number(dayEndHour) <= Number(dayStartHour)) {
      return res.status(400).json({
        error: {
          message: "dayEndHour must be greater than dayStartHour",
          code: "INVALID_DAY_WINDOW"
        }
      });
    }

    let durationMinutes = Number(slotMinutes);
    if (serviceId) {
      const service = await findServiceById(serviceId);
      if (!service || !service.is_active) {
        return res.status(404).json({
          error: {
            message: "Service not found or inactive",
            code: "SERVICE_NOT_FOUND"
          }
        });
      }

      durationMinutes = Number(service.duration_minutes);
    }

    const busyIntervals = await listBusyIntervals({ from: fromDate.toISOString(), to: toDate.toISOString() });

    const slots = buildAvailableSlots({
      from: fromDate,
      to: toDate,
      durationMinutes,
      slotMinutes: Number(slotMinutes),
      dayStartHour: Number(dayStartHour),
      dayEndHour: Number(dayEndHour),
      busyIntervals
    });

    res.json({
      data: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        durationMinutes,
        slotMinutes: Number(slotMinutes),
        dayStartHour: Number(dayStartHour),
        dayEndHour: Number(dayEndHour),
        totalSlots: slots.length,
        slots
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPublicReservation,
  getReservations,
  getReservation,
  patchReservationStatus,
  getAvailability
  ,reschedulePublicReservation
  ,cancelPublicReservation
  ,rescheduleReservation
};
