/**
 * mock-data.js
 * Datos ficticios para probar el flujo de reserva sin backend corriendo.
 * La forma de estos datos replica exactamente la forma real de las respuestas
 * del backend (ver src/controllers/service.controller.js,
 * src/controllers/reservation.controller.js y src/utils/availability.js).
 */

// Replica GET /api/services -> { data: [...] }
const MOCK_SERVICES = [
  {
    id: 1,
    name: 'Fisioterapia Deportiva',
    description: 'Prevención y tratamiento de lesiones asociadas a la práctica deportiva.',
    duration_minutes: 60,
    is_active: true
  },
  {
    id: 2,
    name: 'Rehabilitación Funcional',
    description: 'Recuperación de movilidad y fuerza tras cirugías o lesiones.',
    duration_minutes: 45,
    is_active: true
  },
  {
    id: 3,
    name: 'Terapia Manual',
    description: 'Alivio de tensiones musculares, contracturas y dolor localizado.',
    duration_minutes: 50,
    is_active: true
  }
];

/**
 * Replica GET /api/reservations/availability -> { data: {...} }
 * Simula un par de horas "ocupadas" (10:00 y 15:00) para poder probar
 * que el frontend oculta/deshabilita correctamente los horarios no disponibles.
 */
function buildMockAvailability({ serviceId, date }) {
  const service = MOCK_SERVICES.find((s) => s.id === Number(serviceId)) || MOCK_SERVICES[0];
  const duration = service.duration_minutes;
  const busyHours = ['10:00', '15:00'];
  const startHour = RESERVATION_CONFIG.DEFAULT_DAY_START_HOUR;
  const endHour = RESERVATION_CONFIG.DEFAULT_DAY_END_HOUR;
  const slots = [];

  for (let hour = startHour; hour < endHour; hour++) {
    for (const minute of [0, 30]) {
      const hh = String(hour).padStart(2, '0');
      const mm = String(minute).padStart(2, '0');
      const timeLabel = `${hh}:${mm}`;
      if (busyHours.includes(timeLabel)) continue;

      const startTime = `${date}T${hh}:${mm}:00.000Z`;
      const endDate = new Date(startTime);
      endDate.setUTCMinutes(endDate.getUTCMinutes() + duration);
      const endTime = endDate.toISOString();

      // No ofrecer un slot cuyo fin se pase de la ventana del día
      const windowEnd = new Date(`${date}T${String(endHour).padStart(2, '0')}:00:00.000Z`);
      if (endDate > windowEnd) continue;

      slots.push({ startTime, endTime });
    }
  }

  return {
    from: `${date}T00:00:00.000Z`,
    to: `${date}T23:59:59.000Z`,
    durationMinutes: duration,
    slotMinutes: RESERVATION_CONFIG.DEFAULT_SLOT_MINUTES,
    dayStartHour: startHour,
    dayEndHour: endHour,
    totalSlots: slots.length,
    slots
  };
}

/**
 * Simula POST /api/clients/register (registro o recuperación de
 * cliente por email) -> { data: {...} }. Se guarda en memoria durante
 * la sesión del navegador para que, si el mismo email vuelve a
 * reservar, reciba el mismo id (igual que haría el backend real con
 * la restricción UNIQUE en email -> CLIENT_ALREADY_EXISTS).
 */
const MOCK_CLIENTS_BY_EMAIL = {};
let mockClientAutoId = 1000;

function buildMockClient({ fullName, email, phone }) {
  const key = email.trim().toLowerCase();
  if (MOCK_CLIENTS_BY_EMAIL[key]) {
    return MOCK_CLIENTS_BY_EMAIL[key];
  }

  mockClientAutoId += 1;
  const client = { id: mockClientAutoId, full_name: fullName, email, phone };
  MOCK_CLIENTS_BY_EMAIL[key] = client;
  return client;
}

/**
 * Replica la respuesta 201 de POST /api/reservations/public -> { data: {...} }
 */
function buildMockReservationSuccess(payload) {
  const service = MOCK_SERVICES.find((s) => s.id === Number(payload.serviceId));
  const client =
    Object.values(MOCK_CLIENTS_BY_EMAIL).find((c) => c.id === Number(payload.clientId)) || {
      id: payload.clientId,
      full_name: 'Cliente',
      email: '',
      phone: ''
    };

  return {
    data: {
      reservation: {
        id: Math.floor(Math.random() * 100000),
        service_id: payload.serviceId,
        start_time: payload.startTime,
        end_time: payload.endTime,
        status: 'pending',
        notes: payload.notes || null
      },
      client,
      service: {
        id: service ? service.id : payload.serviceId,
        name: service ? service.name : 'Servicio',
        durationMinutes: service ? service.duration_minutes : 30
      }
    }
  };
}
