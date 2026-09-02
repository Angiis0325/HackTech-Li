const express = require("express");
const { requireAuth, authorizeRoles } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { serviceIdSchema, createServiceSchema, updateServiceSchema } = require("../schemas/service.schema");
const { getActiveServices, getServiceStaff, getAllServices, postService, patchService, deleteService } = require("../controllers/service.controller");

const router = express.Router();

router.get("/", getActiveServices);
router.get("/:id/staff", validate(serviceIdSchema), getServiceStaff);
router.get("/admin/all", requireAuth, authorizeRoles("admin"), getAllServices);
router.post("/", requireAuth, authorizeRoles("admin"), validate(createServiceSchema), postService);
router.patch("/:id", requireAuth, authorizeRoles("admin"), validate(updateServiceSchema), patchService);
router.delete("/:id", requireAuth, authorizeRoles("admin"), validate(serviceIdSchema), deleteService);

module.exports = router;
