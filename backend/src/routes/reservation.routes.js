const express = require("express");
const { publicReservationLimiter } = require("../middlewares/rateLimit");

const { requireAuth, authorizeRoles } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createReservationSchema,
  publicRescheduleSchema,
  publicCancelSchema,
  adminRescheduleSchema,
  updateReservationStatusSchema,
  listReservationsSchema,
  reservationIdSchema,
  availabilitySchema
} = require("../schemas/reservation.schema");
const {
  createPublicReservation,
  getReservations,
  getReservation,
  patchReservationStatus,
  getAvailability
  ,reschedulePublicReservation
  ,cancelPublicReservation
  ,rescheduleReservation
} = require("../controllers/reservation.controller");

const router = express.Router();

router.post("/public", publicReservationLimiter, validate(createReservationSchema), createPublicReservation);
router.patch("/public/:id/reschedule", validate(publicRescheduleSchema), reschedulePublicReservation);
router.patch("/public/:id/cancel", validate(publicCancelSchema), cancelPublicReservation);
router.patch("/:id/reschedule", requireAuth, authorizeRoles("admin", "staff"), validate(adminRescheduleSchema), rescheduleReservation);
router.get("/availability", validate(availabilitySchema), getAvailability);

router.get(
  "/",
  requireAuth,
  authorizeRoles("admin", "staff"),
  validate(listReservationsSchema),
  getReservations
);

router.get(
  "/:id",
  requireAuth,
  authorizeRoles("admin", "staff"),
  validate(reservationIdSchema),
  getReservation
);

router.patch(
  "/:id/status",
  requireAuth,
  authorizeRoles("admin", "staff"),
  validate(updateReservationStatusSchema),
  patchReservationStatus
);

module.exports = router;
