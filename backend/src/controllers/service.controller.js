const {
  listActiveServices,
  listServices,
  findServiceById,
  createService,
  updateService,
  deactivateService
} = require("../repositories/service.repository");
const { listStaffForService } = require("../repositories/staff.repository");
const { createAuditLog } = require("../repositories/audit.repository");

async function getActiveServices(req, res, next) {
  try { res.json({ data: await listActiveServices() }); } catch (error) { next(error); }
}

async function getServiceStaff(req, res, next) {
  try {
    const service = await findServiceById(req.params.id);
    if (!service) return res.status(404).json({ error: { message: "Service not found", code: "SERVICE_NOT_FOUND" } });
    res.json({ data: await listStaffForService(req.params.id) });
  } catch (error) { next(error); }
}

async function getAllServices(req, res, next) {
  try { res.json({ data: await listServices() }); } catch (error) { next(error); }
}

async function postService(req, res, next) {
  try {
    const service = await createService(req.body);
    await createAuditLog({ actorType: "user", actorId: String(req.user.sub), userId: req.user.sub, action: "service.created", entity: "service", entityId: String(service.id) });
    res.status(201).json({ data: service });
  } catch (error) { next(error); }
}

async function patchService(req, res, next) {
  try {
    const service = await updateService(req.params.id, req.body);
    if (!service) return res.status(404).json({ error: { message: "Service not found", code: "SERVICE_NOT_FOUND" } });
    await createAuditLog({ actorType: "user", actorId: String(req.user.sub), userId: req.user.sub, action: "service.updated", entity: "service", entityId: String(service.id) });
    res.json({ data: service });
  } catch (error) { next(error); }
}

async function deleteService(req, res, next) {
  try {
    const service = await deactivateService(req.params.id);
    if (!service) return res.status(404).json({ error: { message: "Service not found", code: "SERVICE_NOT_FOUND" } });
    await createAuditLog({ actorType: "user", actorId: String(req.user.sub), userId: req.user.sub, action: "service.deactivated", entity: "service", entityId: String(service.id) });
    res.json({ data: service });
  } catch (error) { next(error); }
}

module.exports = { getActiveServices, getServiceStaff, getAllServices, postService, patchService, deleteService };
