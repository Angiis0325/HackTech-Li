/**
 * reservation-flow.js
 * Maneja el flujo completo del formulario de reserva del modal:
 * carga de servicios, disponibilidad por servicio/fecha, selección de
 * horario, validación y envío al backend o a los mocks.
 *
 * Depende de: ReservationConfig.js, mock-data.js, reservation-api.js, validation.js
 * IDs esperados en index.html (dentro de #reservationModal):
 *   resService, resDate, resTimeSlots, resStartTime, resEndTime,
 *   resName, resEmail, resPhone, resNotes, resFeedback, reservationForm
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

    reservationState.availableSlots = (response.data && response.data.slots) || [];
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

  const formData = {
    serviceId: reservationState.selectedServiceId,
    date: reservationState.selectedDate,
    startTime: reservationState.selectedSlot ? reservationState.selectedSlot.startTime : '',
    fullName: document.getElementById('resName').value,
    email: document.getElementById('resEmail').value,
    phone: document.getElementById('resPhone').value,
    notes: document.getElementById('resNotes').value
  };

  const { isValid, errors } = validateReservationForm(formData);
  if (!isValid) {
    showFieldErrors(errors);
    showFeedback('error', 'Revisa los campos marcados antes de continuar.');
    return;
  }

  setSubmitting(true);

  try {
    // Paso 1: registrar (o recuperar) el cliente para obtener su clientId,
    // que es lo que exige POST /reservations/public en este backend.
    const clientResponse = await apiRegisterOrGetClient({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim()
    });
    const clientId = clientResponse.data.id;

    // Paso 2: crear la reserva con el clientId ya resuelto.
    const payload = {
      clientId,
      serviceId: Number(formData.serviceId),
      startTime: reservationState.selectedSlot.startTime,
      endTime: reservationState.selectedSlot.endTime,
      notes: formData.notes ? formData.notes.trim() : undefined
    };

    const response = await apiCreateReservation(payload);
    const { reservation, service } = response.data;
    showFeedback(
      'success',
      `Reserva confirmada para "${service.name}" el ${formatDateTimeLabel(reservation.start_time)}. Te enviaremos la confirmación por correo.`
    );
    document.getElementById('reservationForm').reset();
    resetSlotSelection();
    renderSlotsHint('Selecciona un servicio y una fecha para ver horarios.');
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
    CLIENT_NOT_FOUND: 'No se encontró tu registro de cliente. Verifica tu correo.'
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
  const btn = document.getElementById('resSubmitBtn');
  if (btn) {
    btn.disabled = isSubmitting;
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
}

function clearFeedback() {
  const el = document.getElementById('resFeedback');
  if (!el) return;
  el.textContent = '';
  el.className = 'reservation-feedback';
}

function showFieldErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    const el = document.getElementById(`error-${field}`);
    if (el) el.textContent = message;
  });
}

function clearFieldError(field) {
  const el = document.getElementById(`error-${field}`);
  if (el) el.textContent = '';
}

function clearAllFieldErrors() {
  ['service', 'date', 'time', 'fullName', 'email', 'phone', 'notes'].forEach(clearFieldError);
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
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateTimeLabel(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
