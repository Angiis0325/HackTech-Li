const { z } = require("zod");

const listAuditLogsSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(500).optional()
  })
});

module.exports = {
  listAuditLogsSchema
};
