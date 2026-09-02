const {
  listStaffUsers,
  findUserById,
  assignServiceToUser,
  unassignServiceFromUser,
  listServicesForUser
} = require("../repositories/staff.repository");
const { findServiceById } = require("../repositories/reservation.repository");
const { createAuditLog } = require("../repositories/audit.repository");

// --- Admin/staff: listado de personal activo ---
async function getStaff(req, res, next) {
  try {
    const staff = await listStaffUsers();
    res.json({ data: staff });
  } catch (error) {
    next(error);
  }
}

// --- Admin/staff: servicios que puede atender un usuario ---
async function getServicesForUser(req, res, next) {
  try {
    const { userId } = req.params;

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: { message: "User not found", code: "USER_NOT_FOUND" }
      });
    }

    const services = await listServicesForUser(userId);
    res.json({ data: services });
  } catch (error) {
    next(error);
  }
}

// --- Admin: asignar un servicio a un miembro del staff ---
async function postAssignService(req, res, next) {
  try {
    const { userId } = req.params;
    const { serviceId } = req.body;

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: { message: "User not found", code: "USER_NOT_FOUND" }
      });
    }

    const service = await findServiceById(serviceId);
    if (!service) {
      return res.status(404).json({
        error: { message: "Service not found", code: "SERVICE_NOT_FOUND" }
      });
    }

    const assignment = await assignServiceToUser(userId, serviceId);

    await createAuditLog({
      actorType: "user",
      actorId: req.user ? String(req.user.sub) : null,
      userId: req.user ? req.user.sub : null,
      action: "staff.service.assigned",
      entity: "user_service",
      entityId: `${userId}:${serviceId}`,
      metadata: { userId: Number(userId), serviceId: Number(serviceId) }
    });

    res.status(201).json({
      data: assignment || { userId: Number(userId), serviceId: Number(serviceId), alreadyAssigned: true }
    });
  } catch (error) {
    next(error);
  }
}

// --- Admin: quitar un servicio de un miembro del staff ---
async function deleteAssignService(req, res, next) {
  try {
    const { userId, serviceId } = req.params;

    const removed = await unassignServiceFromUser(userId, serviceId);
    if (!removed) {
      return res.status(404).json({
        error: { message: "Assignment not found", code: "ASSIGNMENT_NOT_FOUND" }
      });
    }

    await createAuditLog({
      actorType: "user",
      actorId: req.user ? String(req.user.sub) : null,
      userId: req.user ? req.user.sub : null,
      action: "staff.service.unassigned",
      entity: "user_service",
      entityId: `${userId}:${serviceId}`,
      metadata: { userId: Number(userId), serviceId: Number(serviceId) }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStaff,
  getServicesForUser,
  postAssignService,
  deleteAssignService
};
