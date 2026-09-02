const express = require("express");

const { requireAuth, authorizeRoles } = require("../middlewares/auth");
const { registerLimiter } = require("../middlewares/rateLimit");
const validate = require("../middlewares/validate");
const {
  registerClientSchema,
  lookupClientByEmailSchema,
  addClientChannelSchema,
  clientChannelIdSchema,
  clientIdSchema
  ,updateClientSchema
} = require("../schemas/client.schema");
const {
  registerClient,
  getClientByEmail,
  getClients,
  postClientChannel,
  getClientChannels,
  deleteClientChannel
  ,patchClient
  ,removeClient
} = require("../controllers/client.controller");

const router = express.Router();

// Registro público de clientes (sin login, sin contraseña).
// Es el paso previo obligatorio para poder crear una reserva.
router.post("/register", registerLimiter, validate(registerClientSchema), registerClient);

// El cliente consulta su propio client_id a partir de su email
// (para reservar de nuevo sin tener que volver a registrarse).
router.get("/lookup", validate(lookupClientByEmailSchema), getClientByEmail);

// Staff/admin: listado de clientes (requiere JWT)
router.get("/", requireAuth, authorizeRoles("admin", "staff"), getClients);
router.patch("/:id", requireAuth, authorizeRoles("admin"), validate(updateClientSchema), patchClient);
router.delete("/:id", requireAuth, authorizeRoles("admin"), validate(clientIdSchema), removeClient);

// El cliente agrega un canal de notificación (ej. su chat_id de Telegram)
// usando el client_id que ya tiene. Sin login (mismo modelo que
// cancelar/reprogramar reservas: acceso por posesión del id/email).
router.post("/:id/channels", validate(addClientChannelSchema), postClientChannel);

// Staff/admin: ver y borrar canales de un cliente (para el panel / n8n)
router.get(
  "/:id/channels",
  requireAuth,
  authorizeRoles("admin", "staff"),
  validate(clientIdSchema),
  getClientChannels
);
router.delete(
  "/:id/channels/:channelId",
  requireAuth,
  authorizeRoles("admin", "staff"),
  validate(clientChannelIdSchema),
  deleteClientChannel
);

module.exports = router;
