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
    API_BASE_URL: (typeof window !== 'undefined') ? '/api' : 'http://localhost:4000/api',
    USE_MOCK: false,
    DEFAULT_SLOT_MINUTES: 30,
    DEFAULT_DAY_START_HOUR: 8,
    DEFAULT_DAY_END_HOUR: 18
};
