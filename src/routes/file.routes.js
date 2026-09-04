const express = require("express");
const { requireAuth, authorizeRoles } = require("../middlewares/auth");
const { uploadFiles } = require("../middlewares/fileUpload");
const {
  uploadPublicFiles,
  uploadInternalFiles,
  listReservationFiles,
  downloadFile
} = require("../controllers/file.controller");

const router = express.Router();

router.post("/public", uploadFiles.array("files"), uploadPublicFiles);

router.post(
  "/reservations/:reservationId",
  requireAuth,
  authorizeRoles("admin", "staff", "doctor"),
  uploadFiles.array("files"),
  uploadInternalFiles
);

router.get(
  "/reservations/:reservationId",
  requireAuth,
  authorizeRoles("admin", "staff", "doctor"),
  listReservationFiles
);

router.get(
  "/:id/download",
  requireAuth,
  authorizeRoles("admin", "staff", "doctor"),
  downloadFile
);

module.exports = router;
