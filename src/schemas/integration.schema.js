const { z } = require("zod");

const n8nReservationStatusSchema = z.object({
  body: z.object({
    status: z.enum(["confirmed", "cancelled", "completed"]),
    calendarEventId: z.string().max(255).optional(),
    externalReference: z.string().max(255).optional(),
    message: z.string().max(500).optional()
  }),
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  query: z.object({})
});

module.exports = {
  n8nReservationStatusSchema
};
