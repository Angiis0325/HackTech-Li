const express = require("express");

const { requireAuth, authorizeRoles } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createReservationSchema,
  updateReservationStatusSchema,
  listReservationsSchema,
  reservationIdSchema,
  availabilitySchema,
  rescheduleReservationSchema,
  publicCancelReservationSchema,
  publicRescheduleReservationSchema
} = require("../schemas/reservation.schema");
const {
  createPublicReservation,
  getReservations,
  getReservation,
  patchReservationStatus,
  getAvailability,
  adminRescheduleReservation,
  publicCancelReservation,
  publicRescheduleReservation
} = require("../controllers/reservation.controller");

const router = express.Router();

router.post("/public", validate(createReservationSchema), createPublicReservation);
router.get("/availability", validate(availabilitySchema), getAvailability);

// Cliente gestiona su propia reserva (sin login, verificado por email)
router.patch(
  "/public/:id/cancel",
  validate(publicCancelReservationSchema),
  publicCancelReservation
);

router.patch(
  "/public/:id/reschedule",
  validate(publicRescheduleReservationSchema),
  publicRescheduleReservation
);

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

router.patch(
  "/:id/reschedule",
  requireAuth,
  authorizeRoles("admin", "staff"),
  validate(rescheduleReservationSchema),
  adminRescheduleReservation
);

module.exports = router;
