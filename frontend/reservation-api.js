
async function apiGetServices() {
  if (RESERVATION_CONFIG.USE_MOCK) {
    await mockDelay();
    return { data: MOCK_SERVICES.filter((s) => s.is_active) };
  }

  const res = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/services`);
  return handleApiResponse(res);
}

async function apiGetAvailability({ serviceId, date }) {
  if (RESERVATION_CONFIG.USE_MOCK) {
    await mockDelay();
    return { data: buildMockAvailability({ serviceId, date }) };
  }

  const from = `${date}T00:00:00.000Z`;
  const to = `${date}T23:59:59.000Z`;
  const params = new URLSearchParams({ from, to, serviceId: String(serviceId) });

  const res = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/reservations/availability?${params.toString()}`);
  return handleApiResponse(res);
}

async function apiCreateReservation(payload) {
  if (RESERVATION_CONFIG.USE_MOCK) {
    await mockDelay();

    if (typeof payload.startTime === 'string' && payload.startTime.includes('T10:00:00')) {
      const err = new Error('El horario seleccionado ya no está disponible.');
      err.code = 'SLOT_UNAVAILABLE';
      err.status = 409;
      throw err;
    }

    return buildMockReservationSuccess(payload);
  }

  const res = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/reservations/public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return handleApiResponse(res);
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

function mockDelay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
