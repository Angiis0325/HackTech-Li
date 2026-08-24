const test = require("node:test");
const assert = require("node:assert/strict");

const baseUrl = process.env.API_BASE_URL || "http://localhost:4000";
const n8nToken = process.env.N8N_WEBHOOK_TOKEN || "hacktech_n8n_local_token";

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
  const health = await request("/api/health");
  assert.equal(health.response.status, 200, `Health failed: ${JSON.stringify(health.body)}`);
  assert.equal(health.body?.data?.status, "ok");

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

  assert.equal(register.response.status, 201, `Register failed: ${JSON.stringify(register.body)}`);
  const token = register.body?.data?.token;
  assert.ok(token, "Register token missing");

  const now = Date.now();
  const start = new Date(now + 24 * 60 * 60 * 1000);
  start.setUTCMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const reservation = await request("/api/reservations/public", {
    method: "POST",
    body: JSON.stringify({
      fullName: "Smoke Client",
      email: `client.${Date.now()}@hacktech.local`,
      phone: "3001234567",
      serviceId: 1,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      notes: "Smoke reservation"
    })
  });

  assert.equal(reservation.response.status, 201, `Create reservation failed: ${JSON.stringify(reservation.body)}`);
  const reservationId = reservation.body?.data?.reservation?.id;
  assert.ok(reservationId, "Reservation id missing");

  const availability = await request(
    `/api/reservations/availability?from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(
      new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString()
    )}&serviceId=1&slotMinutes=30`
  );

  assert.equal(availability.response.status, 200, `Availability failed: ${JSON.stringify(availability.body)}`);
  assert.ok(Array.isArray(availability.body?.data?.slots), "Availability slots missing");

  const integration = await request(`/api/integrations/n8n/reservations/${reservationId}/status`, {
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
  });

  assert.equal(integration.response.status, 200, `Integration failed: ${JSON.stringify(integration.body)}`);
  assert.equal(integration.body?.data?.status, "confirmed");

  const audit = await request("/api/audit-logs?limit=20", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  assert.equal(audit.response.status, 200, `Audit logs failed: ${JSON.stringify(audit.body)}`);
  assert.ok(Array.isArray(audit.body?.data), "Audit logs array missing");
});
