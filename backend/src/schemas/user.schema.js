const { z } = require("zod");

const userIdSchema = z.object({ body: z.object({}), params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({}) });
const updateUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().optional(),
    role: z.enum(["admin", "staff"]).optional(),
    isActive: z.boolean().optional()
  }).refine((body) => Object.keys(body).length > 0, "At least one field is required"),
  params: z.object({ id: z.coerce.number().int().positive() }), query: z.object({})
});
module.exports = { userIdSchema, updateUserSchema };