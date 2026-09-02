const rateLimit = require("express-rate-limit");
const env = require("../config/env");

// En NODE_ENV=test, los tests automáticos disparan muchas requests desde
// la misma IP en segundos (eso no representa abuso real), así que el
// límite se desactiva solo en ese entorno. En development/production
// sigue aplicando normalmente.
const skipInTests = () => env.nodeEnv === "test";

// Límite estricto para login: evita fuerza bruta sobre contraseñas.
// 10 intentos por IP cada 15 minutos.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: {
    error: {
      message: "Too many login attempts. Try again later.",
      code: "TOO_MANY_LOGIN_ATTEMPTS"
    }
  }
});

// Límite más amplio para registro (uso interno, pero igual protegido).
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: {
    error: {
      message: "Too many registration attempts. Try again later.",
      code: "TOO_MANY_REGISTER_ATTEMPTS"
    }
  }
});

// Límite para reservas públicas: evita que un script llene la agenda
// de reservas falsas o sature la validación de disponibilidad.
const publicReservationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: {
    error: {
      message: "Too many reservation requests. Try again later.",
      code: "TOO_MANY_RESERVATION_ATTEMPTS"
    }
  }
});

module.exports = {
  loginLimiter,
  registerLimiter,
  publicReservationLimiter
};
