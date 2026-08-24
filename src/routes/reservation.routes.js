const express = require("express");

const { requireAuth, authorizeRoles } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createReservationSchema,
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
} = require("../controllers/reservation.controller");

const router = express.Router();

router.post("/public", validate(createReservationSchema), createPublicReservation);
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
