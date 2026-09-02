const express = require("express");

const { requireAuth, authorizeRoles } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  userIdParamSchema,
  assignServiceSchema,
  unassignServiceSchema
} = require("../schemas/staff.schema");
const {
  getStaff,
  getServicesForUser,
  postAssignService,
  deleteAssignService
} = require("../controllers/staff.controller");

const router = express.Router();

// Todo el módulo de gestión de staff es solo para admin/staff autenticado.
router.use(requireAuth, authorizeRoles("admin", "staff"));

router.get("/", getStaff);
router.get("/:userId/services", validate(userIdParamSchema), getServicesForUser);
router.post("/:userId/services", validate(assignServiceSchema), postAssignService);
router.delete("/:userId/services/:serviceId", validate(unassignServiceSchema), deleteAssignService);

module.exports = router;
