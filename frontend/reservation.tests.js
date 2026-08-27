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
  context.RESERVATION_CONFIG.USE_MOCK = false;
  console.log(`\n[Modo REAL] Probando contra ${context.RESERVATION_CONFIG.API_BASE_URL}`);
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

  console.log('\nPOST /clients/register + POST /reservations/public');
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
  });

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

    await assert.rejects(
      () =>
        context.apiCreateReservation({
          clientId: clientResponse.data.id,
          serviceId: services[0].id,
          startTime: `${testDate}T10:00:00.000Z`,
          endTime: `${testDate}T11:00:00.000Z`
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
