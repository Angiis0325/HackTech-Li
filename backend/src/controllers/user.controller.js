const { listUsers, findUserById, updateUser } = require("../repositories/user.repository");
const { createAuditLog } = require("../repositories/audit.repository");

async function getUsers(req, res, next) { try { res.json({ data: await listUsers() }); } catch (error) { next(error); } }
async function patchUser(req, res, next) {
  try {
    const user = await updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: { message: "User not found", code: "USER_NOT_FOUND" } });
    await createAuditLog({ actorType: "user", actorId: String(req.user.sub), userId: req.user.sub, action: "user.updated", entity: "user", entityId: String(user.id) });
    res.json({ data: user });
  } catch (error) { next(error); }
}
async function getUser(req, res, next) {
  try { const user = await findUserById(req.params.id); if (!user) return res.status(404).json({ error: { message: "User not found", code: "USER_NOT_FOUND" } }); res.json({ data: user }); } catch (error) { next(error); }
}
module.exports = { getUsers, getUser, patchUser };