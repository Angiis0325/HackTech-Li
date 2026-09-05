/**
 * reservation-flow.js
 * Maneja el flujo completo del formulario de reserva del modal:
 * carga de servicios, disponibilidad por servicio/fecha, selección de
 * horario, validación, carga de archivos adjuntos y envío al backend
 * o a los mocks.
 */

const reservationState = {
  services: [],
  servicesLoaded: false,
  selectedServiceId: null,
  selectedDate: null,
  availableSlots: [],
  selectedSlot: null,
  submitting: false
};

document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('resDate');
  const serviceSelect = document.getElementById('resService');
  const form = document.getElementById('reservationForm');

  if (dateInput) {
    dateInput.min = todayAsInputValue();
  }

  if (serviceSelect) {
    serviceSelect.addEventListener('change', onServiceOrDateChange);
  }

  if (dateInput) {
    dateInput.addEventListener('change', onServiceOrDateChange);
  }

  if (form) {
    form.addEventListener('submit', onSubmitReservation);
  }

  ensureFileInputEl();
  loadServices();
});

// Hook que app.js llama al abrir el modal (showModal), para precargar
// servicios y preseleccionar el servicio elegido desde una tarjeta.
window.onReservationModalOpen = async function onReservationModalOpen(serviceName) {
  clearFeedback();
  resetSlotSelection();

  if (!reservationState.servicesLoaded) {
    await loadServices();
  }

  if (serviceName) {
    const match = reservationState.services.find((s) => s.name === serviceName);
    const serviceSelect = document.getElementById('resService');
    if (match && serviceSelect) {
      serviceSelect.value = String(match.id);
      reservationState.selectedServiceId = match.id;
      onServiceOrDateChange();
    }
  }
};

async function loadServices() {
  const serviceSelect = document.getElementById('resService');
  if (!serviceSelect) return;

  setSelectLoading(serviceSelect, 'Cargando servicios...');

  try {
    const response = await apiGetServices();
    reservationState.services = response.data || [];
    reservationState.servicesLoaded = true;
    renderServiceOptions(reservationState.services);
  } catch (error) {
    showFeedback('error', 'No se pudieron cargar los servicios. Intenta de nuevo más tarde.');
    serviceSelect.innerHTML = '<option value="">No disponible</option>';
  }
}

function renderServiceOptions(services) {
  const serviceSelect = document.getElementById('resService');
  if (!serviceSelect) return;

  const options = ['<option value="">Seleccione un servicio...</option>']
    .concat(
      services.map(
        (s) => `<option value="${s.id}">${s.name} (${s.duration_minutes} min)</option>`
      )
    );

  serviceSelect.innerHTML = options.join('');
}

async function onServiceOrDateChange() {
  const serviceSelect = document.getElementById('resService');
  const dateInput = document.getElementById('resDate');

  reservationState.selectedServiceId = serviceSelect.value || null;
  reservationState.selectedDate = dateInput.value || null;
  resetSlotSelection();

  if (!reservationState.selectedServiceId || !reservationState.selectedDate) {
    renderSlotsHint('Selecciona un servicio y una fecha para ver horarios.');
    return;
  }

  await loadAvailability();
}

async function loadAvailability() {
  renderSlotsHint('Buscando horarios disponibles...');

  try {
    const response = await apiGetAvailability({
      serviceId: reservationState.selectedServiceId,
      date: reservationState.selectedDate
    });

    const rawSlots = (response.data && response.data.slots) || [];

    // Filtro estricto: Solo permitimos horarios hábiles entre las 8:00 a. m. y las 6:00 p. m. (en UTC del servidor)
    reservationState.availableSlots = rawSlots.filter(slot => {
      const slotDate = new Date(slot.startTime);
      const hour = slotDate.getUTCHours();
      return hour >= 8 && hour < 18;
    });

    renderTimeSlots(reservationState.availableSlots);
  } catch (error) {
    reservationState.availableSlots = [];
    renderSlotsHint(describeApiError(error, 'No se pudo consultar la disponibilidad.'));
  }
}

function renderSlotsHint(message) {
  const container = document.getElementById('resTimeSlots');
  if (container) {
    container.innerHTML = `<p class="slots-hint">${message}</p>`;
  }
}

function renderTimeSlots(slots) {
  const container = document.getElementById('resTimeSlots');
  if (!container) return;

  if (!slots.length) {
    container.innerHTML = '<p class="slots-hint">No hay horarios disponibles para esa fecha. Prueba otro día.</p>';
    return;
  }

  container.innerHTML = slots
    .map((slot, index) => {
      const label = formatTimeLabel(slot.startTime);
      return `<button type="button" class="slot-btn" data-slot-index="${index}">${label}</button>`;
    })
    .join('');

  container.querySelectorAll('.slot-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectSlot(Number(btn.dataset.slotIndex)));
  });
}

function selectSlot(index) {
  const slot = reservationState.availableSlots[index];
  if (!slot) return;

  reservationState.selectedSlot = slot;
  document.getElementById('resStartTime').value = slot.startTime;
  document.getElementById('resEndTime').value = slot.endTime;

  document.querySelectorAll('.slot-btn').forEach((btn, i) => {
    btn.classList.toggle('slot-btn-selected', i === index);
  });

  clearFieldError('time');
}

function resetSlotSelection() {
  reservationState.selectedSlot = null;
  reservationState.availableSlots = [];
  const startInput = document.getElementById('resStartTime');
  const endInput = document.getElementById('resEndTime');
  if (startInput) startInput.value = '';
  if (endInput) endInput.value = '';
}

async function onSubmitReservation(event) {
  event.preventDefault();
  if (reservationState.submitting) return;

  clearFeedback();
  clearAllFieldErrors();

  const notesEl = document.getElementById('resNotes');
  const filesEl = document.getElementById('resFile');

  const formData = {
    serviceId: reservationState.selectedServiceId,
    date: reservationState.selectedDate,
    startTime: reservationState.selectedSlot ? reservationState.selectedSlot.startTime : '',
    fullName: document.getElementById('resName').value,
    email: document.getElementById('resEmail').value,
    phone: document.getElementById('resPhone').value,
    notes: notesEl ? notesEl.value : ''
  };

  const { isValid, errors } = validateReservationForm(formData);
  const filesResult = validateFiles(filesEl ? filesEl.files : null);
  const allErrors = { ...errors, ...filesResult.errors };

  if (!isValid || !filesResult.isValid) {
    showFieldErrors(allErrors);
    showFeedback('error', 'Revisa los campos marcados antes de continuar.');
    return;
  }

  setSubmitting(true);

  try {
    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      serviceId: Number(formData.serviceId),
      startTime: reservationState.selectedSlot.startTime,
      endTime: reservationState.selectedSlot.endTime,
      notes: formData.notes ? formData.notes.trim() : undefined
    };

    const response = await apiCreateReservation(payload);
    const { reservation, service } = response.data;

    let successMessage = `Reserva confirmada para "${service.name}" el ${formatDateTimeLabel(reservation.start_time)}. Te enviaremos la confirmación por correo.`;

    if (filesEl && filesEl.files && filesEl.files.length > 0) {
      try {
        await apiUploadReservationFiles({
          reservationId: reservation.id,
          email: payload.email,
          files: filesEl.files
        });
        successMessage += ' Tus archivos adjuntos se subieron correctamente.';
      } catch (uploadError) {
        successMessage += ` Sin embargo, no se pudieron subir los archivos adjuntos (${describeApiError(uploadError, 'error desconocido')}). Puedes intentar reenviarlos más tarde.`;
      }
    }

    showFeedback('success', successMessage);
    resetSlotSelection();
    window.dispatchEvent(new CustomEvent('reservationSuccess', { detail: { reservation, service } }));
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR' && error.details) {
      showFeedback('error', 'El backend rechazó algunos datos del formulario. Revisa la información.');
    } else {
      showFeedback('error', describeApiError(error, 'No se pudo completar la reserva.'));
    }

    if (error.code === 'SLOT_UNAVAILABLE') {
      resetSlotSelection();
      loadAvailability();
    }
  } finally {
    setSubmitting(false);
  }
}

function describeApiError(error, fallbackMessage) {
  const knownMessages = {
    SLOT_UNAVAILABLE: 'Ese horario ya no está disponible. Elige otro.',
    SERVICE_NOT_FOUND: 'El servicio seleccionado ya no existe o no está activo.',
    INVALID_TIME_RANGE: 'El rango de horario seleccionado no es válido.',
    RANGE_TOO_LARGE: 'El rango de fechas consultado es demasiado amplio.',
    VALIDATION_ERROR: 'Alguno de los datos ingresados no es válido.',
    UNSUPPORTED_FILE_TYPE: 'Uno de los archivos no tiene un formato permitido.',
    INVALID_FILE_UPLOAD: 'Faltan datos para subir el archivo.',
    FILE_UPLOAD_LIMIT_EXCEEDED: 'Uno de los archivos excede el límite permitido.',
    RESERVATION_NOT_FOUND: 'No se encontró la reserva para adjuntar el archivo.',
    EMAIL_MISMATCH: 'El correo no coincide con el de la reserva.'
  };

  if (error && error.code && knownMessages[error.code]) {
    return knownMessages[error.code];
  }

  if (error && error.status === 0) {
    return 'No hay conexión con el servidor. Verifica tu red o inténtalo más tarde.';
  }

  return (error && error.message) || fallbackMessage;
}

function setSubmitting(isSubmitting) {
  reservationState.submitting = isSubmitting;

  if (typeof window.toggleLoadingState === 'function') {
    window.toggleLoadingState(isSubmitting);
    return;
  }

  const btn = document.getElementById('resSubmitBtn');
  if (!btn) return;

  btn.disabled = isSubmitting;

  const btnText = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');
  if (btnText && btnLoader) {
    btnText.textContent = isSubmitting ? 'Enviando...' : 'Confirmar Reserva';
    btnLoader.classList.toggle('d-none', !isSubmitting);
  } else {
    btn.textContent = isSubmitting ? 'Enviando...' : 'Confirmar Reserva';
  }
}

function setSelectLoading(selectEl, label) {
  selectEl.innerHTML = `<option value="">${label}</option>`;
}

function showFeedback(type, message) {
  const el = document.getElementById('resFeedback');
  if (!el) return;
  el.textContent = message;
  el.className = `reservation-feedback reservation-feedback-${type}`;
  el.style.display = 'block';
}

function clearFeedback() {
  const el = document.getElementById('resFeedback');
  if (!el) return;
  el.textContent = '';
  el.className = 'reservation-feedback';
  el.style.display = 'none';
}

const FIELD_INPUT_IDS = {
  fullName: 'resName',
  email: 'resEmail',
  phone: 'resPhone',
  notes: 'resNotes',
  files: 'resFile'
};

function ensureFieldErrorEl(field) {
  let el = document.getElementById(`error-${field}`);
  if (el) return el;

  const inputId = FIELD_INPUT_IDS[field];
  const input = inputId ? document.getElementById(inputId) : null;
  if (!input) return null;

  el = document.createElement('span');
  el.id = `error-${field}`;
  el.className = 'text-danger small mt-1 d-block';
  input.insertAdjacentElement('afterend', el);
  return el;
}

function ensureFileInputEl() {
  if (document.getElementById('resFile')) return;

  const phoneField = document.getElementById('resPhone');
  if (!phoneField) return;
  const phoneGroup = phoneField.closest('.mb-3') || phoneField;

  const wrapper = document.createElement('div');
  wrapper.className = 'mb-3';
  wrapper.innerHTML = `
    <label for="resFile" class="form-label fw-semibold text-dark">Adjuntar documentos (opcional)</label>
    <input type="file" id="resFile" name="archivos" class="form-control shadow-none" multiple
           accept=".pdf,.jpg,.jpeg,.png,.webp,.docx">
    <small class="text-secondary d-block mt-1">PDF, JPG, PNG, WEBP o DOCX. Máximo 5 archivos, 10MB cada uno.</small>
    <span class="text-danger small mt-1 d-block" id="error-files"></span>
  `;

  phoneGroup.insertAdjacentElement('afterend', wrapper);
}

function showFieldErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    const el = document.getElementById(`error-${field}`) || ensureFieldErrorEl(field);
    if (el) el.textContent = message;
  });
}

function clearFieldError(field) {
  const el = document.getElementById(`error-${field}`);
  if (el) el.textContent = '';
}

function clearAllFieldErrors() {
  ['service', 'date', 'time', 'fullName', 'email', 'phone', 'notes', 'files'].forEach(clearFieldError);
}

function todayAsInputValue() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimeLabel(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString('es-CO', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateTimeLabel(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('es-CO', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}