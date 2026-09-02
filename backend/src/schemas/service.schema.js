const { z } = require("zod");

const serviceIdSchema = z.object({
  body: z.object({}),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({})
});

const createServiceSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).optional(),
    durationMinutes: z.coerce.number().int().min(15).max(480)
  }),
  params: z.object({}),
  query: z.object({})
});

const updateServiceSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    durationMinutes: z.coerce.number().int().min(15).max(480).optional(),
    isActive: z.boolean().optional()
  }).refine((body) => Object.keys(body).length > 0, "At least one field is required"),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({})
});

module.exports = { serviceIdSchema, createServiceSchema, updateServiceSchema };