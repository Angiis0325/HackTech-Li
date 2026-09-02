const express = require("express");

const validate = require("../middlewares/validate");
const { requireIntegrationToken } = require("../middlewares/integrationAuth");
const { n8nReservationStatusSchema } = require("../schemas/integration.schema");
const { updateReservationFromN8n, getReservationChannels } = require("../controllers/integration.controller");

const router = express.Router();

router.patch(
  "/n8n/reservations/:id/status",
  requireIntegrationToken,
  validate(n8nReservationStatusSchema),
  updateReservationFromN8n
);
router.get("/n8n/reservations/:id/channels", requireIntegrationToken, getReservationChannels);

module.exports = router;
