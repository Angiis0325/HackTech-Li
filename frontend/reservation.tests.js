#!/usr/bin/env node
/**
 * reservation.tests.js
 * Pruebas del flujo de reserva (validación + llamadas a la API) sin
 * necesidad de navegador. No usa ningún framework de testing -son
 * aserciones simples con node:assert-, así no hay que instalar nada.
 *
 * reservation-config.js, mock-data.js, reservation-api.js y
 * validation.js están escritos como scripts de navegador (comparten
 * variables globales entre sí vía <script>, no usan module.exports).
 * Para poder probarlos con Node sin tocarlos ni tocar el DOM, los
 * cargamos con vm.createContext en un "mini navegador" falso que solo
 * expone lo que esos 4 archivos necesitan (fetch, setTimeout, etc.).
 *
 * Uso:
 *   node reservation.tests.js            -> corre contra mock-data.js
 *                                            (no necesita el backend corriendo)
 *   node reservation.tests.js --real     -> corre contra el backend real en
 *                                            RESERVATION_CONFIG.API_BASE_URL
 *                                            (correr antes: npm run dev, con
 *                                            la base de datos ya migrada/con seed)
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const useReal = process.argv.includes('--real');

const context = {
  console,
  fetch,
  setTimeout,
  URLSearchParams,
  Math,
  Date,
  Number,
  String,
  Object,
  Error
};
vm.createContext(context);

const files = ['reservation-config.js', 'mock-data.js', 'reservation-api.js', 'validation.js'];
for (const file of files) {
  const code = fs.readFileSync(path.join(__dirname, file), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

if (useReal) {
  // RESERVATION_CONFIG se declaró con `const` dentro de reservation-config.js,
  // así que no queda expuesto como context.RESERVATION_CONFIG (a diferencia
  // de las funciones declaradas con `function`, que sí quedan como
  // propiedades del contexto). Para leerlo/mutarlo hay que hacerlo con otro
  // vm.runInContext, ejecutado en ese mismo entorno léxico.
  vm.runInContext('RESERVATION_CONFIG.USE_MOCK = false;', context, { filename: 'test-setup.js' });
  const apiBaseUrl = vm.runInContext('RESERVATION_CONFIG.API_BASE_URL', context, { filename: 'test-setup.js' });
  console.log(`\n[Modo REAL] Probando contra ${apiBaseUrl}`);
  console.log('(el backend debe estar corriendo: npm run dev)\n');
} else {
  console.log('\n[Modo MOCK] Probando contra mock-data.js (no requiere backend)\n');
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  \u2714 ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`  \u2718 ${name}`);
    console.log(`     ${error.message}`);
    failed += 1;
  }
}

async function run() {
  console.log('validation.js');

  await test('rechaza un formulario vacío', () => {
    const { isValid, errors } = context.validateReservationForm({});
    assert.equal(isValid, false);
    assert.ok(errors.service && errors.date && errors.time && errors.fullName && errors.email && errors.phone);
  });

  await test('rechaza un correo inválido', () => {
    const { errors } = context.validateReservationForm({
      serviceId: 1,
      date: '2099-01-01',
      startTime: '2099-01-01T10:00:00.000Z',
      fullName: 'Juan Pérez',
      email: 'esto-no-es-un-correo',
      phone: '3001234567'
    });
    assert.ok(errors.email);
  });

  await test('rechaza una fecha en el pasado', () => {
    const { errors } = context.validateReservationForm({
      serviceId: 1,
      date: '2000-01-01',
      startTime: '2000-01-01T10:00:00.000Z',
      fullName: 'Juan Pérez',
      email: 'juan@correo.com',
      phone: '3001234567'
    });
    assert.ok(errors.date);
  });

  await test('acepta un formulario completo y válido', () => {
    const { isValid } = context.validateReservationForm({
      serviceId: 1,
      date: '2099-01-01',
      startTime: '2099-01-01T10:00:00.000Z',
      fullName: 'Juan Pérez',
      email: 'juan@correo.com',
      phone: '3001234567'
    });
    assert.equal(isValid, true);
  });

  await test('rechaza un teléfono demasiado corto', () => {
    const { errors } = context.validateReservationForm({
      serviceId: 1,
      date: '2099-01-01',
      startTime: '2099-01-01T10:00:00.000Z',
      fullName: 'Juan Pérez',
      email: 'juan@correo.com',
      phone: '123'
    });
    assert.ok(errors.phone);
  });

  await test('rechaza un nombre de una sola letra', () => {
    const { errors } = context.validateReservationForm({
      serviceId: 1,
      date: '2099-01-01',
      startTime: '2099-01-01T10:00:00.000Z',
      fullName: 'J',
      email: 'juan@correo.com',
      phone: '3001234567'
    });
    assert.ok(errors.fullName);
  });

  await test('rechaza notas de más de 500 caracteres', () => {
    const { errors } = context.validateReservationForm({
      serviceId: 1,
      date: '2099-01-01',
      startTime: '2099-01-01T10:00:00.000Z',
      fullName: 'Juan Pérez',
      email: 'juan@correo.com',
      phone: '3001234567',
      notes: 'a'.repeat(501)
    });
    assert.ok(errors.notes);
  });

  await test('rechaza si no se seleccionó horario (aunque el resto sea válido)', () => {
    const { isValid, errors } = context.validateReservationForm({
      serviceId: 1,
      date: '2099-01-01',
      startTime: '',
      fullName: 'Juan Pérez',
      email: 'juan@correo.com',
      phone: '3001234567'
    });
    assert.equal(isValid, false);
    assert.ok(errors.time);
  });

  console.log('\nGET /services');
  let services = [];
  await test('carga la lista de servicios activos', async () => {
    const response = await context.apiGetServices();
    assert.ok(Array.isArray(response.data));
    assert.ok(response.data.length > 0, 'se esperaba al menos un servicio activo');
    services = response.data;
  });

  console.log('\nGET /reservations/availability');
  let slots = [];
  const testDate = '2099-06-15';
  await test('devuelve horarios disponibles para un servicio y fecha', async () => {
    const response = await context.apiGetAvailability({ serviceId: services[0].id, date: testDate });
    assert.ok(Array.isArray(response.data.slots));
    assert.ok(response.data.slots.length > 0, 'se esperaba al menos un horario disponible');
    slots = response.data.slots;
  });

  // El mock (mock-data.js) simula un par de horas siempre "ocupadas" (10:00,
  // 15:00) como fixture fija. Contra el backend real eso no aplica -si nadie
  // ha reservado esa hora todavía, está libre de verdad-, así que esa
  // comprobación específica solo tiene sentido en modo mock.
  if (!useReal) {
    await test('no ofrece un horario ya ocupado (10:00) [fixture del mock]', () => {
      const occupied = slots.some((s) => s.startTime.includes('T10:00:00'));
      assert.equal(occupied, false, 'el slot de las 10:00 debería estar excluido por estar ocupado');
    });
  }

  console.log('\nPOST /clients/register + POST /reservations/public');
  let bookedSlot = null;
  await test('registra un cliente y crea una reserva con datos válidos', async () => {
    const freeSlot = slots.find((s) => !s.startTime.includes('T10:00:00'));
    assert.ok(freeSlot, 'no se encontró un horario libre para la prueba (revisa mock-data.js)');

    const clientResponse = await context.apiRegisterOrGetClient({
      fullName: 'Prueba Automática',
      email: `prueba+${Date.now()}@correo.com`,
      phone: '3000000000'
    });
    assert.ok(clientResponse.data.id, 'falta "id" en la respuesta de registro de cliente');

    const response = await context.apiCreateReservation({
      clientId: clientResponse.data.id,
      serviceId: services[0].id,
      startTime: freeSlot.startTime,
      endTime: freeSlot.endTime,
      notes: 'Reserva creada por reservation.tests.js'
    });

    assert.ok(response.data.reservation, 'falta "reservation" en la respuesta');
    assert.ok(response.data.client, 'falta "client" en la respuesta');
    assert.ok(response.data.service, 'falta "service" en la respuesta');
    bookedSlot = freeSlot;
  });

  if (useReal) {
    await test('el horario recién reservado ya no aparece en disponibilidad', async () => {
      const response = await context.apiGetAvailability({ serviceId: services[0].id, date: testDate });
      const stillFree = response.data.slots.some((s) => s.startTime === bookedSlot.startTime);
      assert.equal(stillFree, false, 'el slot recién reservado debería haber desaparecido de la disponibilidad');
    });
  }

  await test('recupera el mismo clientId al registrar el mismo email dos veces', async () => {
    const email = `repetido+${Date.now()}@correo.com`;
    const first = await context.apiRegisterOrGetClient({ fullName: 'Cliente Repetido', email, phone: '3000000000' });
    const second = await context.apiRegisterOrGetClient({ fullName: 'Cliente Repetido', email, phone: '3000000000' });
    assert.equal(first.data.id, second.data.id);
  });

  await test('rechaza un horario ya ocupado (SLOT_UNAVAILABLE)', async () => {
    const clientResponse = await context.apiRegisterOrGetClient({
      fullName: 'Prueba Choque de Horario',
      email: `choque+${Date.now()}@correo.com`,
      phone: '3000000000'
    });

    // En modo real reutilizamos el horario que ya se reservó arriba (choque
    // genuino contra la base de datos). En modo mock usamos las 10:00, que
    // es el horario que mock-data.js siempre trata como ocupado.
    const targetSlot = useReal
      ? bookedSlot
      : { startTime: `${testDate}T10:00:00.000Z`, endTime: `${testDate}T11:00:00.000Z` };
    assert.ok(targetSlot, 'no hay un horario de referencia para probar el choque');

    await assert.rejects(
      () =>
        context.apiCreateReservation({
          clientId: clientResponse.data.id,
          serviceId: services[0].id,
          startTime: targetSlot.startTime,
          endTime: targetSlot.endTime
        }),
      (error) => {
        assert.equal(error.code, 'SLOT_UNAVAILABLE');
        return true;
      }
    );
  });

  await test('rechaza un servicio inexistente (SERVICE_NOT_FOUND)', async () => {
    const clientResponse = await context.apiRegisterOrGetClient({
      fullName: 'Prueba Servicio Falso',
      email: `falso+${Date.now()}@correo.com`,
      phone: '3000000000'
    });

    await assert.rejects(
      () =>
        context.apiCreateReservation({
          clientId: clientResponse.data.id,
          serviceId: 999999,
          startTime: '2099-06-16T09:00:00.000Z',
          endTime: '2099-06-16T10:00:00.000Z'
        }),
      (error) => {
        assert.equal(error.code, 'SERVICE_NOT_FOUND');
        return true;
      }
    );
  });

  console.log(`\n${passed} pasaron, ${failed} fallaron.\n`);
  process.exitCode = failed > 0 ? 1 : 0;
}

run();