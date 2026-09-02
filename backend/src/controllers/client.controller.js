const {
  createClient,
  findClientById,
  findClientByEmail,
  listClients,
  updateClient,
  deleteClient,
  addClientChannel,
  listClientChannels,
  removeClientChannel
} = require("../repositories/client.repository");
const { createAuditLog } = require("../repositories/audit.repository");

const PG_UNIQUE_VIOLATION = "23505";

// --- Registro de cliente (público o desde el panel de staff) ---
// No requiere login. Es el ÚNICO lugar donde se crean clientes nuevos.
async function registerClient(req, res, next) {
  try {
    const { fullName, email, phone } = req.body;

    const client = await createClient({ fullName, email, phone });

    await createAuditLog({
      actorType: req.user ? "user" : "public",
      actorId: req.user ? String(req.user.sub) : client.email,
      userId: req.user ? req.user.sub : null,
      action: "client.registered",
      entity: "client",
      entityId: String(client.id),
      metadata: { source: req.user ? "admin_api" : "public_web" }
    });

    res.status(201).json({ data: client });
  } catch (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      const existing = await findClientByEmail(req.body.email);
      return res.status(409).json({
        error: {
          message:
            "Ya existe un cliente registrado con ese email. Usa ese registro para reservar (no es necesario volver a registrarte).",
          code: "CLIENT_ALREADY_EXISTS",
          details: existing ? { clientId: existing.id } : null
        }
      });
    }
    next(error);
  }
}

// --- Cliente busca su propio client_id por email antes de reservar ---
async function getClientByEmail(req, res, next) {
  try {
    const { email } = req.query;
    const client = await findClientByEmail(email);

    if (!client) {
      return res.status(404).json({
        error: {
          message: "No existe un cliente registrado con ese email. Regístrate primero.",
          code: "CLIENT_NOT_FOUND"
        }
      });
    }

    res.json({ data: client });
  } catch (error) {
    next(error);
  }
}

// --- Staff/admin: listado de clientes registrados ---
async function getClients(req, res, next) {
  try {
    const clients = await listClients();
    res.json({ data: clients });
  } catch (error) {
    next(error);
  }
}

async function patchClient(req, res, next) {
  try {
    const client = await updateClient(req.params.id, req.body);
    if (!client) return res.status(404).json({ error: { message: "Client not found", code: "CLIENT_NOT_FOUND" } });
    await createAuditLog({ actorType: "user", actorId: String(req.user.sub), userId: req.user.sub, action: "client.updated", entity: "client", entityId: String(client.id) });
    res.json({ data: client });
  } catch (error) { next(error); }
}

async function removeClient(req, res, next) {
  try {
    const removed = await deleteClient(req.params.id);
    if (!removed) return res.status(404).json({ error: { message: "Client not found", code: "CLIENT_NOT_FOUND" } });
    await createAuditLog({ actorType: "user", actorId: String(req.user.sub), userId: req.user.sub, action: "client.deleted", entity: "client", entityId: String(req.params.id) });
    res.status(204).send();
  } catch (error) { next(error); }
}

// --- Cliente agrega un canal de notificación (ej. Telegram) ---
async function postClientChannel(req, res, next) {
  try {
    const { id } = req.params;
    const { channelType, channelValue, isPrimary } = req.body;

    const client = await findClientById(id);
    if (!client) {
      return res.status(404).json({
        error: { message: "Client not found", code: "CLIENT_NOT_FOUND" }
      });
    }

    const channel = await addClientChannel({
      clientId: id,
      channelType,
      channelValue,
      isPrimary: Boolean(isPrimary)
    });

    await createAuditLog({
      actorType: req.user ? "user" : "public",
      actorId: req.user ? String(req.user.sub) : client.email,
      userId: req.user ? req.user.sub : null,
      action: "client.channel.added",
      entity: "client",
      entityId: String(id),
      metadata: { channelType, channelValue }
    });

    res.status(201).json({ data: channel });
  } catch (error) {
    next(error);
  }
}

// --- Staff/admin: ver canales de notificación de un cliente ---
async function getClientChannels(req, res, next) {
  try {
    const { id } = req.params;

    const client = await findClientById(id);
    if (!client) {
      return res.status(404).json({
        error: { message: "Client not found", code: "CLIENT_NOT_FOUND" }
      });
    }

    const channels = await listClientChannels(id);
    res.json({ data: channels });
  } catch (error) {
    next(error);
  }
}

// --- Staff/admin: eliminar un canal de notificación de un cliente ---
async function deleteClientChannel(req, res, next) {
  try {
    const { id, channelId } = req.params;

    const removed = await removeClientChannel(id, channelId);
    if (!removed) {
      return res.status(404).json({
        error: { message: "Channel not found", code: "CHANNEL_NOT_FOUND" }
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerClient,
  getClientByEmail,
  getClients,
  patchClient,
  removeClient,
  postClientChannel,
  getClientChannels,
  deleteClientChannel
};
