const { z } = require("zod");

const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime());

const createReservationSchema = z.object({
  body: z.object({
    clientId: z.coerce.number().int().positive(),
    serviceId: z.coerce.number().int().positive(),
    startTime: isoDate,
    endTime: isoDate,
    notes: z.string().max(500).optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const publicRescheduleSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    startTime: isoDate,
    endTime: isoDate
  }),
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  query: z.object({})
});

const publicCancelSchema = z.object({
  body: z.object({
    email: z.string().trim().email()
  }),
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  query: z.object({})
});

const adminRescheduleSchema = z.object({
  body: z.object({ startTime: isoDate, endTime: isoDate }),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({})
});

const updateReservationStatusSchema = z.object({
  body: z.object({
    status: z.enum(["pending", "confirmed", "cancelled", "completed"])
  }),
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  query: z.object({})
});

const listReservationsSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional()
  })
});

const reservationIdSchema = z.object({
  body: z.object({}),
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  query: z.object({})
});

const availabilitySchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    from: isoDate,
    to: isoDate,
    serviceId: z.coerce.number().int().positive().optional(),
    slotMinutes: z.coerce.number().int().min(15).max(180).optional(),
    dayStartHour: z.coerce.number().int().min(0).max(23).optional(),
    dayEndHour: z.coerce.number().int().min(1).max(24).optional()
  })
});

module.exports = {
  createReservationSchema,
  publicRescheduleSchema,
  publicCancelSchema,
  adminRescheduleSchema,
  updateReservationStatusSchema,
  listReservationsSchema,
  reservationIdSchema,
  availabilitySchema
};
