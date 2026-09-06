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
    // Si estamos en un entorno de producción con un dominio real, usa '/api'.
    // Para cualquier prueba local (localhost, 127.0.0.1, archivos locales o terminal), apunta directamente al puerto 4000.
    API_BASE_URL: (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol !== 'file:')
        ? '/api'
        : 'http://localhost:4000/api',
    USE_MOCK: false,
    DEFAULT_SLOT_MINUTES: 30,
    DEFAULT_DAY_START_HOUR: 8,
    DEFAULT_DAY_END_HOUR: 18
};
