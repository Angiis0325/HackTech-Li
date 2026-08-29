/**
 * Reservationconfig.js
 * Configuración central del módulo de Reservas (frontend).
 *
 * IMPORTANTE PARA EL EQUIPO:
 * - API_BASE_URL debe apuntar al backend real (ver src/app.js del repo:
 *   las rutas están montadas bajo /api, por ejemplo /api/services,
 *   /api/reservations/availability, /api/reservations/public).
 * - USE_MOCK = true permite trabajar y probar todo el flujo de reserva
 *   SIN backend corriendo, usando frontend/js/mock-data.js.
 *   Cuando el backend esté desplegado/corriendo, cambiar a false.
 */

const RESERVATION_CONFIG = {
  // Backend local por defecto según src/config/env.js (PORT=4000) y app.js (prefijo /api)
  API_BASE_URL: 'http://localhost:4000/api',

  // true = usar datos ficticios (mock-data.js). false = pegarle al backend real.
  USE_MOCK: false,

  // Valores por defecto para la consulta de disponibilidad
  // (coinciden con los defaults del backend en reservation.controller.js -> getAvailability)
  DEFAULT_SLOT_MINUTES: 30,
  DEFAULT_DAY_START_HOUR: 8,
  DEFAULT_DAY_END_HOUR: 18
};
