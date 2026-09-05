// reservation-api.js

async function apiGetServices() {
  if (RESERVATION_CONFIG.USE_MOCK) {
    await mockDelay();
    return { data: MOCK_SERVICES.filter((s) => s.is_active) };
  }

  try {
    const res = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/services`);
    return await handleApiResponse(res);
  } catch (error) {
    throw normalizeNetworkError(error);
  }
}

async function apiGetAvailability({ serviceId, date }) {
  if (RESERVATION_CONFIG.USE_MOCK) {
    await mockDelay();
    return { data: buildMockAvailability({ serviceId, date }) };
  }

  const from = `${date}T00:00:00Z`;
  const to = `${date}T23:59:59Z`;
  const params = new URLSearchParams({ from, to, serviceId: String(serviceId) });

  try {
    const res = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/reservations/availability?${params.toString()}`);
    return await handleApiResponse(res);
  } catch (error) {
    throw normalizeNetworkError(error);
  }
}

/**
 * Este backend crea (o reutiliza, vía upsertClient) al cliente
 * internamente a partir de fullName/email/phone -no exige un clientId
 * previo, a diferencia de otra variante del backend que sí lo pedía
 * (ver src/controllers/reservation.controller.js: createPublicReservation
 * llama a upsertClient() él mismo).
 */
async function apiCreateReservation(payload) {
  if (RESERVATION_CONFIG.USE_MOCK) {
    await mockDelay();

    const serviceExists = MOCK_SERVICES.some(
      (s) => s.id === Number(payload.serviceId) && s.is_active
    );
    if (!serviceExists) {
      const err = new Error('El servicio seleccionado no existe o no está activo.');
      err.code = 'SERVICE_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (typeof payload.startTime === 'string' && payload.startTime.includes('T10:00:00')) {
      const err = new Error('El horario seleccionado ya no está disponible.');
      err.code = 'SLOT_UNAVAILABLE';
      err.status = 409;
      throw err;
    }

    return buildMockReservationSuccess(payload);
  }

  try {
    const res = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/reservations/public`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await handleApiResponse(res);
  } catch (error) {
    throw normalizeNetworkError(error);
  }
}

/**
 * Sube archivos adjuntos a una reserva ya creada (POST /api/files/public,
 * ver backend/src/routes/file.routes.js + file.controller.js:
 * uploadPublicFiles). El backend exige reservationId + email -el mismo
 * correo con el que se creó la reserva, para verificar que quien sube
 * el archivo es el dueño de la reserva- y al menos un archivo.
 * Tipos permitidos: PDF, JPG, PNG, WEBP, DOCX. Límite: 10MB c/u, 5 por
 * envío (ver backend/src/middlewares/fileUpload.js).
 */
async function apiUploadReservationFiles({ reservationId, email, files }) {
  if (!files || files.length === 0) {
    return { data: [] };
  }

  if (RESERVATION_CONFIG.USE_MOCK) {
    await mockDelay();
    return { data: buildMockFileUploadSuccess(files) };
  }

  const formData = new FormData();
  formData.append('reservationId', String(reservationId));
  formData.append('email', email);
  Array.from(files).forEach((file) => formData.append('files', file));

  try {
    const res = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/files/public`, {
      method: 'POST',
      body: formData
    });

    return await handleApiResponse(res);
  } catch (error) {
    throw normalizeNetworkError(error);
  }
}

async function handleApiResponse(res) {
  let json = null;
  try {
    json = await res.json();
  } catch (parseError) {
    json = null;
  }

  if (!res.ok) {
    const message = (json && json.error && json.error.message) || `Error HTTP ${res.status}`;
    const code = (json && json.error && json.error.code) || 'UNKNOWN_ERROR';
    const err = new Error(message);
    err.code = code;
    err.status = res.status;
    err.details = (json && json.error && json.error.details) || null;
    throw err;
  }

  return json;
}

/**
 * Normaliza fallos de red/CORS/servidor caído (el propio fetch() lanzando
 * un TypeError sin status ni code) al mismo formato que usa
 * handleApiResponse, para que describeApiError() en reservation-flow.js
 * siempre sepa mostrar un mensaje claro ("No hay conexión con el
 * servidor...") en vez de un error crudo tipo "Failed to fetch".
 * Si el error ya viene de handleApiResponse (ya tiene status), se deja tal cual.
 */
function normalizeNetworkError(error) {
  if (error && typeof error.status === 'number') {
    return error;
  }

  const err = new Error(
    'No hay conexión con el servidor. Verifica que el backend esté corriendo y que RESERVATION_CONFIG.API_BASE_URL sea correcto.'
  );
  err.code = 'NETWORK_ERROR';
  err.status = 0;
  err.cause = error;
  return err;
}

function mockDelay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}