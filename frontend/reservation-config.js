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
  // Ruta relativa: funciona tanto en local (si sirves el frontend
  // desde el mismo backend) como en producción en Render, sin
  // importar el dominio.
  API_BASE_URL: '/api',
  // true = usar datos ficticios (mock-data.js). false = pegarle al backend real.
  USE_MOCK: false,
  // Valores por defecto para la consulta de disponibilidad
  // (coinciden con los defaults del backend en reservation.controller.js -> getAvailability)
  DEFAULT_SLOT_MINUTES: 30,
  DEFAULT_DAY_START_HOUR: 8,
  DEFAULT_DAY_END_HOUR: 18
};
