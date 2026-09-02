const { z } = require("zod");

// Registro de cliente (público, sin contraseña, sin login).
// Lo puede usar tanto el sitio web público como el panel de staff/admin.
const registerClientSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().min(7).max(30)
  }),
  params: z.object({}),
  query: z.object({})
});

const lookupClientByEmailSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    email: z.string().trim().email()
  })
});

const clientIdSchema = z.object({
  body: z.object({}),
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  query: z.object({})
});

const updateClientSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(7).max(30).optional()
  }).refine((body) => Object.keys(body).length > 0, "At least one field is required"),
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({})
});

// El cliente agrega un canal de notificación (ej. su chat_id de Telegram)
// usando el client_id que recibió al registrarse. Sin login: cualquiera
// con el client_id correcto podría, en teoría, agregarlo; se acepta como
// riesgo bajo (mismo modelo que cancelar/reprogramar por email) porque
// no expone datos sensibles, solo dónde recibir notificaciones.
const addClientChannelSchema = z.object({
  body: z.object({
    channelType: z.enum(["email", "telegram", "sms"]),
    channelValue: z.string().trim().min(3).max(160),
    isPrimary: z.boolean().optional()
  }),
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  query: z.object({})
});

const clientChannelIdSchema = z.object({
  body: z.object({}),
  params: z.object({
    id: z.coerce.number().int().positive(),
    channelId: z.coerce.number().int().positive()
  }),
  query: z.object({})
});

module.exports = {
  registerClientSchema,
  lookupClientByEmailSchema,
  clientIdSchema,
  updateClientSchema,
  addClientChannelSchema,
  clientChannelIdSchema
};
