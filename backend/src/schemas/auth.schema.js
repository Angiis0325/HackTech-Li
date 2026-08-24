const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    password: z.string().min(8).max(72),
    role: z.enum(["admin", "staff"]).optional(),
    inviteCode: z.string().optional()
  }),
  params: z.object({}),
  query: z.object({})
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(8).max(72)
  }),
  params: z.object({}),
  query: z.object({})
});

module.exports = {
  registerSchema,
  loginSchema
};
