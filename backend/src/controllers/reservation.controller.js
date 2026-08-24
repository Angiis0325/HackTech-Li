const {
  findServiceById,
  upsertClient,
  hasOverlap,
  hasOverlapExcluding,
  listBusyIntervals,
  createReservation,
  listReservations,
  getReservationById,
  updateReservationStatus,
  rescheduleReservation,
  cancelReservation
} = require("../repositories/reservation.repository");
const { createAuditLog } = require("../repositories/audit.repository");
const { buildAvailableSlots } = require("../utils/availability");

async function createPublicReservation(req, res, next) {
  try {
    const { fullName, email, phone, serviceId, startTime, endTime, notes } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);

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

    const overlap = await hasOverlap(startTime, endTime);
    if (overlap) {
      return res.status(409).json({
        error: {
          message: "Selected schedule is not available",
          code: "SLOT_UNAVAILABLE"
        }
      });
    }

    const client = await upsertClient({ fullName, email, phone });
    const reservation = await createReservation({
      clientId: client.id,
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

const ACTIVE_STATUSES = ["pending", "confirmed"];

function isReservationOwner(reservation, email) {
  return reservation.client_email?.toLowerCase() === email.trim().toLowerCase();
}

async function validateAndReschedule({ id, startTime, endTime }) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return { error: { status: 400, message: "endTime must be greater than startTime", code: "INVALID_TIME_RANGE" } };
  }

  const overlap = await hasOverlapExcluding(startTime, endTime, id);
  if (overlap) {
    return { error: { status: 409, message: "Selected schedule is not available", code: "SLOT_UNAVAILABLE" } };
  }

  const updated = await rescheduleReservation({ id, startTime, endTime });
  return { updated };
}

// --- Admin/staff: reprogramar (requiere JWT) ---
async function adminRescheduleReservation(req, res, next) {
  try {
    const { id } = req.params;
    const { startTime, endTime } = req.body;

    const reservation = await getReservationById(id);
    if (!reservation) {
      return res.status(404).json({
        error: { message: "Reservation not found", code: "RESERVATION_NOT_FOUND" }
      });
    }

    if (!ACTIVE_STATUSES.includes(reservation.status)) {
      return res.status(409).json({
        error: { message: "Only pending or confirmed reservations can be rescheduled", code: "RESERVATION_NOT_ACTIVE" }
      });
    }

    const { error, updated } = await validateAndReschedule({ id, startTime, endTime });
    if (error) {
      return res.status(error.status).json({ error: { message: error.message, code: error.code } });
    }

    await createAuditLog({
      actorType: "user",
      actorId: req.user ? String(req.user.sub) : null,
      action: "reservation.rescheduled",
      entity: "reservation",
      entityId: String(id),
      metadata: {
        fromStartTime: reservation.start_time,
        fromEndTime: reservation.end_time,
        toStartTime: startTime,
        toEndTime: endTime,
        source: "admin_api"
      }
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

// --- Cliente: cancelar su propia reserva (publico, verifica email) ---
async function publicCancelReservation(req, res, next) {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const reservation = await getReservationById(id);
    if (!reservation) {
      return res.status(404).json({
        error: { message: "Reservation not found", code: "RESERVATION_NOT_FOUND" }
      });
    }

    if (!isReservationOwner(reservation, email)) {
      return res.status(403).json({
        error: { message: "Email does not match this reservation", code: "EMAIL_MISMATCH" }
      });
    }

    if (!ACTIVE_STATUSES.includes(reservation.status)) {
      return res.status(409).json({
        error: { message: "Only pending or confirmed reservations can be cancelled", code: "RESERVATION_NOT_ACTIVE" }
      });
    }

    const updated = await cancelReservation(id);

    await createAuditLog({
      actorType: "public",
      actorId: email,
      action: "reservation.cancelled",
      entity: "reservation",
      entityId: String(id),
      metadata: {
        fromStatus: reservation.status,
        source: "public_web"
      }
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
}

// --- Cliente: reprogramar su propia reserva (publico, verifica email) ---
async function publicRescheduleReservation(req, res, next) {
  try {
    const { id } = req.params;
    const { email, startTime, endTime } = req.body;

    const reservation = await getReservationById(id);
    if (!reservation) {
      return res.status(404).json({
        error: { message: "Reservation not found", code: "RESERVATION_NOT_FOUND" }
      });
    }

    if (!isReservationOwner(reservation, email)) {
      return res.status(403).json({
        error: { message: "Email does not match this reservation", code: "EMAIL_MISMATCH" }
      });
    }

    if (!ACTIVE_STATUSES.includes(reservation.status)) {
      return res.status(409).json({
        error: { message: "Only pending or confirmed reservations can be rescheduled", code: "RESERVATION_NOT_ACTIVE" }
      });
    }

    const { error, updated } = await validateAndReschedule({ id, startTime, endTime });
    if (error) {
      return res.status(error.status).json({ error: { message: error.message, code: error.code } });
    }

    await createAuditLog({
      actorType: "public",
      actorId: email,
      action: "reservation.rescheduled",
      entity: "reservation",
      entityId: String(id),
      metadata: {
        fromStartTime: reservation.start_time,
        fromEndTime: reservation.end_time,
        toStartTime: startTime,
        toEndTime: endTime,
        source: "public_web"
      }
    });

    res.json({ data: updated });
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
  getAvailability,
  adminRescheduleReservation,
  publicCancelReservation,
  publicRescheduleReservation
};
