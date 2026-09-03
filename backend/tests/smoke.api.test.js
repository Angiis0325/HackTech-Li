const test = require("node:test");
const assert = require("node:assert/strict");

const baseUrl = process.env.API_BASE_URL || "http://localhost:4000";
const n8nToken =
  process.env.N8N_WEBHOOK_TOKEN || "hacktech_n8n_local_token";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { response, body };
}

test("API smoke flow: health, auth, reservation, integration, audit", async () => {
  // =========================================================
  // 1. HEALTH CHECK
  // =========================================================

  const health = await request("/api/health");

  assert.equal(
    health.response.status,
    200,
    `Health failed: ${JSON.stringify(health.body)}`
  );

  assert.equal(
    health.body?.data?.status,
    "ok"
  );

  // =========================================================
  // 2. REGISTRO / AUTENTICACIÓN
  // =========================================================

  const uniqueEmail = `smoke.${Date.now()}@hacktech.local`;

  const register = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke Admin",
      email: uniqueEmail,
      password: "Password123",
      role: "admin",
      inviteCode: "hacktech2026"
    })
  });

  assert.equal(
    register.response.status,
    201,
    `Register failed: ${JSON.stringify(register.body)}`
  );

  const token = register.body?.data?.token;

  assert.ok(
    token,
    "Register token missing"
  );

  // =========================================================
  // 3. BUSCAR UN HORARIO REALMENTE DISPONIBLE
  // =========================================================

  // Buscar disponibilidad para el día siguiente.
  const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Comenzar a las 08:00 UTC.
  startDate.setUTCHours(8, 0, 0, 0);

  // Buscar hasta las 18:00 UTC.
  const endDate = new Date(startDate);
  endDate.setUTCHours(18, 0, 0, 0);

  const availability = await request(
    `/api/reservations/availability?from=${encodeURIComponent(
      startDate.toISOString()
    )}&to=${encodeURIComponent(
      endDate.toISOString()
    )}&serviceId=1`
  );

  assert.equal(
    availability.response.status,
    200,
    `Availability failed: ${JSON.stringify(availability.body)}`
  );

  const slots = availability.body?.data?.slots;

  assert.ok(
    Array.isArray(slots),
    "Availability slots missing"
  );

  assert.ok(
    slots.length > 0,
    "No available slots found for smoke test"
  );

  // Tomamos el primer horario que el backend confirmó como disponible.
  const selectedSlot = slots[0];

  assert.ok(
    selectedSlot?.startTime,
    "Selected slot startTime missing"
  );

  assert.ok(
    selectedSlot?.endTime,
    "Selected slot endTime missing"
  );

  // =========================================================
  // 4. CREAR RESERVA
  // =========================================================

  const reservation = await request("/api/reservations/public", {
    method: "POST",
    body: JSON.stringify({
      fullName: "Smoke Client",
      email: `client.${Date.now()}@hacktech.local`,
      phone: "3001234567",
      serviceId: 1,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      notes: "Smoke reservation"
    })
  });

  assert.equal(
    reservation.response.status,
    201,
    `Create reservation failed: ${JSON.stringify(reservation.body)}`
  );

  const reservationId =
    reservation.body?.data?.reservation?.id;

  assert.ok(
    reservationId,
    "Reservation id missing"
  );

  // =========================================================
  // 5. VERIFICAR DISPONIBILIDAD
  // =========================================================

  const availabilityAfterReservation = await request(
    `/api/reservations/availability?from=${encodeURIComponent(
      startDate.toISOString()
    )}&to=${encodeURIComponent(
      endDate.toISOString()
    )}&serviceId=1&slotMinutes=30`
  );

  assert.equal(
    availabilityAfterReservation.response.status,
    200,
    `Availability after reservation failed: ${JSON.stringify(
      availabilityAfterReservation.body
    )}`
  );

  assert.ok(
    Array.isArray(
      availabilityAfterReservation.body?.data?.slots
    ),
    "Availability slots missing after reservation"
  );

  // =========================================================
  // 6. INTEGRACIÓN N8N
  // =========================================================
  //
  // Este endpoint pertenece al contrato del backend.
  // No requiere que n8n esté ejecutándose.
  //
  // Posteriormente Grupo 1 podrá utilizar este endpoint
  // desde su workflow de n8n.
  // =========================================================

  const integration = await request(
    `/api/integrations/n8n/reservations/${reservationId}/status`,
    {
      method: "PATCH",
      headers: {
        "x-integration-token": n8nToken
      },
      body: JSON.stringify({
        status: "confirmed",
        calendarEventId: `evt_${Date.now()}`,
        externalReference: `smoke-${Date.now()}`,
        message: "Updated by smoke test"
      })
    }
  );

  assert.equal(
    integration.response.status,
    200,
    `Integration failed: ${JSON.stringify(integration.body)}`
  );

  assert.equal(
    integration.body?.data?.status,
    "confirmed"
  );

  // =========================================================
  // 7. AUDITORÍA
  // =========================================================

  const audit = await request(
    "/api/audit-logs?limit=20",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  assert.equal(
    audit.response.status,
    200,
    `Audit logs failed: ${JSON.stringify(audit.body)}`
  );

  assert.ok(
    Array.isArray(audit.body?.data),
    "Audit logs array missing"
  );
});