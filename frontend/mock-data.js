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
 * Replica la respuesta 201 de POST /api/reservations/public -> { data: {...} }
 * Este backend arma el cliente internamente (upsertClient) a partir de
 * fullName/email/phone recibidos directo en el body -no hay clientId-.
 */
function buildMockReservationSuccess(payload) {
  const service = MOCK_SERVICES.find((s) => s.id === Number(payload.serviceId));

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
      client: {
        id: Math.floor(Math.random() * 100000),
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone
      },
      service: {
        id: service ? service.id : payload.serviceId,
        name: service ? service.name : 'Servicio',
        durationMinutes: service ? service.duration_minutes : 30
      }
    }
  };
}

/**
 * Replica la respuesta 201 de POST /api/files/public -> { data: [...] }
 * (ver backend/src/controllers/file.controller.js: serializeFile).
 */
function buildMockFileUploadSuccess(files) {
  return Array.from(files).map((file, index) => ({
    id: Math.floor(Math.random() * 100000) + index,
    original_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    category: 'client_attachment',
    downloadUrl: `#mock-download-${file.name}`
  }));
}
