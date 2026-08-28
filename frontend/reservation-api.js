
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

/**
 * Registra al cliente (o recupera el existente) para obtener su
 * clientId, que es lo que exige POST /reservations/public (ver
 * src/schemas/reservation.schema.js: createReservationSchema).
 *
 * Flujo: intenta registrar -> si el backend responde 409
 * CLIENT_ALREADY_EXISTS (mismo email ya registrado), reutiliza el
 * clientId que el propio error trae en `details.clientId`, sin
 * necesidad de una segunda llamada a /clients/lookup.
 */
async function apiRegisterOrGetClient({ fullName, email, phone }) {
  if (RESERVATION_CONFIG.USE_MOCK) {
    await mockDelay();
    return { data: buildMockClient({ fullName, email, phone }) };
  }

  try {
    const res = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/clients/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, phone })
    });

    return await handleApiResponse(res);
  } catch (error) {
    const normalized = normalizeNetworkError(error);
    if (normalized.code === 'CLIENT_ALREADY_EXISTS' && normalized.details && normalized.details.clientId) {
      return { data: { id: normalized.details.clientId, full_name: fullName, email, phone } };
    }
    throw normalized;
  }
}

async function apiGetAvailability({ serviceId, date }) {
  if (RESERVATION_CONFIG.USE_MOCK) {
    await mockDelay();
    return { data: buildMockAvailability({ serviceId, date }) };
  }

  const from = `${date}T00:00:00.000Z`;
  const to = `${date}T23:59:59.000Z`;
  const params = new URLSearchParams({ from, to, serviceId: String(serviceId) });

  try {
    const res = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/reservations/availability?${params.toString()}`);
    return await handleApiResponse(res);
  } catch (error) {
    throw normalizeNetworkError(error);
  }
}

async function apiCreateReservation(payload) {
  if (RESERVATION_CONFIG.USE_MOCK) {
    await mockDelay();

    // Fidelidad con el backend real: src/controllers/reservation.controller.js
    // responde 404 SERVICE_NOT_FOUND si el servicio no existe o no está activo.
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
