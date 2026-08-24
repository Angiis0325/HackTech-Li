/**
 * validation.js
 * Validaciones de cliente para el formulario de reserva.
 *
 * Reglas alineadas con src/schemas/reservation.schema.js (createReservationSchema)
 * del backend, para que el formulario nunca envíe algo que el backend vaya a
 * rechazar por validación:
 *   - fullName: string, 2 a 120 caracteres
 *   - email: formato de correo válido
 *   - phone: string, 7 a 30 caracteres
 *   - serviceId: entero positivo
 *   - startTime / endTime: fecha ISO válida
 *   - notes: opcional, máximo 500 caracteres
 *
 * Además se valida en cliente (el backend no lo exige explícitamente, pero
 * es una regla de negocio razonable) que la fecha elegida no sea en el pasado.
 */

const RESERVATION_VALIDATION_MESSAGES = {
  service: 'Selecciona un servicio.',
  date: 'Selecciona una fecha válida (no puede ser anterior a hoy).',
  time: 'Selecciona un horario disponible.',
  fullName: 'El nombre debe tener entre 2 y 120 caracteres.',
  email: 'Ingresa un correo electrónico válido.',
  phone: 'Ingresa un teléfono válido (mínimo 7 dígitos).',
  notes: 'Las notas no pueden superar los 500 caracteres.'
};

/**
 * @param {Object} data
 * @param {number|string} data.serviceId
 * @param {string} data.date        'YYYY-MM-DD'
 * @param {string} data.startTime   ISO string o vacío
 * @param {string} data.fullName
 * @param {string} data.email
 * @param {string} data.phone
 * @param {string} [data.notes]
 * @returns {{ isValid: boolean, errors: Object<string,string> }}
 */
function validateReservationForm(data) {
  const errors = {};

  if (!data.serviceId) {
    errors.service = RESERVATION_VALIDATION_MESSAGES.service;
  }

  if (!data.date) {
    errors.date = RESERVATION_VALIDATION_MESSAGES.date;
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(`${data.date}T00:00:00`);
    if (selectedDate < today) {
      errors.date = RESERVATION_VALIDATION_MESSAGES.date;
    }
  }

  if (!data.startTime) {
    errors.time = RESERVATION_VALIDATION_MESSAGES.time;
  }

  const name = (data.fullName || '').trim();
  if (name.length < 2 || name.length > 120) {
    errors.fullName = RESERVATION_VALIDATION_MESSAGES.fullName;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test((data.email || '').trim())) {
    errors.email = RESERVATION_VALIDATION_MESSAGES.email;
  }

  const phoneDigits = (data.phone || '').replace(/\D/g, '');
  if (phoneDigits.length < 7 || phoneDigits.length > 30) {
    errors.phone = RESERVATION_VALIDATION_MESSAGES.phone;
  }

  if (data.notes && data.notes.length > 500) {
    errors.notes = RESERVATION_VALIDATION_MESSAGES.notes;
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
