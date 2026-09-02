const test = require("node:test");
const assert = require("node:assert/strict");

const baseUrl = process.env.API_BASE_URL || "http://localhost:4000";

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

async function createReservation(clientEmail, hourOffset) {
  // Se agrega un jitter aleatorio grande para que corridas repetidas del
  // test no choquen contra reservas dejadas por una corrida anterior.
  const jitterHours = Math.floor(Math.random() * 17000);
  const start = new Date(Date.now() + (hourOffset + jitterHours) * 60 * 60 * 1000);
  start.setUTCMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  // El cliente debe existir antes de reservar: se registra primero
  // (sin login) y se usa el clientId devuelto para crear la reserva.
  const register = await request("/api/clients/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: "Cliente Reschedule Test",
      email: clientEmail,
      phone: "3001234567"
    })
  });
  assert.equal(register.response.status, 201, `Register client failed: ${JSON.stringify(register.body)}`);
  const clientId = register.body.data.id;

  const { response, body } = await request("/api/reservations/public", {
    method: "POST",
    body: JSON.stringify({
      clientId,
      serviceId: 1,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      notes: "Smoke test reprogramar/cancelar"
    })
  });

  assert.equal(response.status, 201, `Create reservation failed: ${JSON.stringify(body)}`);
  return { reservationId: body.data.reservation.id, start, end };
}

test("Cliente puede reprogramar su propia reserva (publico, verificado por email)", async () => {
  const email = `reschedule.${Date.now()}@hacktech.local`;
  const { reservationId, start } = await createReservation(email, 48);

  const newStart = new Date(start.getTime() + 5 * 60 * 60 * 1000);
  const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);

  const wrongEmail = await request(`/api/reservations/public/${reservationId}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify({
      email: "no-soy-el-cliente@hacktech.local",
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString()
    })
  });
  assert.equal(wrongEmail.response.status, 403, `Debia rechazar email distinto: ${JSON.stringify(wrongEmail.body)}`);
  assert.equal(wrongEmail.body?.error?.code, "EMAIL_MISMATCH");

  const ok = await request(`/api/reservations/public/${reservationId}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify({
      email,
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString()
    })
  });
  assert.equal(ok.response.status, 200, `Reschedule failed: ${JSON.stringify(ok.body)}`);
  assert.equal(ok.body?.data?.status, "pending");
});

test("Cliente puede cancelar su propia reserva (publico, verificado por email)", async () => {
  const email = `cancel.${Date.now()}@hacktech.local`;
  const { reservationId } = await createReservation(email, 72);

  const wrongEmail = await request(`/api/reservations/public/${reservationId}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ email: "otro@hacktech.local" })
  });
  assert.equal(wrongEmail.response.status, 403, `Debia rechazar email distinto: ${JSON.stringify(wrongEmail.body)}`);

  const ok = await request(`/api/reservations/public/${reservationId}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ email })
  });
  assert.equal(ok.response.status, 200, `Cancel failed: ${JSON.stringify(ok.body)}`);
  assert.equal(ok.body?.data?.status, "cancelled");

  // Una reserva ya cancelada no se puede volver a cancelar
  const again = await request(`/api/reservations/public/${reservationId}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ email })
  });
  assert.equal(again.response.status, 409, `Debia rechazar doble cancelacion: ${JSON.stringify(again.body)}`);
  assert.equal(again.body?.error?.code, "RESERVATION_NOT_ACTIVE");
});

test("Reprogramar a un horario ocupado devuelve 409 SLOT_UNAVAILABLE", async () => {
  const emailA = `occupant.${Date.now()}@hacktech.local`;
  const emailB = `mover.${Date.now()}@hacktech.local`;

  const occupant = await createReservation(emailA, 96);
  const mover = await createReservation(emailB, 120);

  const conflict = await request(`/api/reservations/public/${mover.reservationId}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify({
      email: emailB,
      startTime: occupant.start.toISOString(),
      endTime: occupant.end.toISOString()
    })
  });

  assert.equal(conflict.response.status, 409, `Debia rechazar solape: ${JSON.stringify(conflict.body)}`);
  assert.equal(conflict.body?.error?.code, "SLOT_UNAVAILABLE");
});
