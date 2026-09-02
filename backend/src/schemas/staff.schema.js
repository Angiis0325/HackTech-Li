const { z } = require("zod");

const userIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({
    userId: z.coerce.number().int().positive()
  }),
  query: z.object({})
});

const assignServiceSchema = z.object({
  body: z.object({
    serviceId: z.coerce.number().int().positive()
  }),
  params: z.object({
    userId: z.coerce.number().int().positive()
  }),
  query: z.object({})
});

const unassignServiceSchema = z.object({
  body: z.object({}),
  params: z.object({
    userId: z.coerce.number().int().positive(),
    serviceId: z.coerce.number().int().positive()
  }),
  query: z.object({})
});

module.exports = {
  userIdParamSchema,
  assignServiceSchema,
  unassignServiceSchema
};
