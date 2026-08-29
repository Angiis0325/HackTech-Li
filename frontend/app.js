/**
 * app.js
 * Lógica delegada del Modal de Reservas y utilidades UI para la integración.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Escuchar el evento de éxito emitido por la lógica de integración
    window.addEventListener('reservationSuccess', () => {
        // Retrasar el cierre para que el usuario pueda leer el mensaje verde de éxito
        setTimeout(() => {
            closeReservationModal();
            resetReservationForm();
        }, 2500); // 2.5 segundos
    });
});

/* Apertura y Cierre del Modal */
function openReservationModal(serviceName = null) {
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
        modalBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    if (typeof window.onReservationModalOpen === 'function') {
        window.onReservationModalOpen(serviceName);
    }
}

function closeReservationModal(event = null) {
    if (event && event.target && event.currentTarget && event.target !== event.currentTarget) {
        return;
    }

    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
        modalBackdrop.classList.remove('active');
        document.body.style.overflow = '';
        
        // Limpieza de feedback al cerrar
        const feedback = document.getElementById('resFeedback');
        if (feedback) {
            feedback.style.display = 'none';
            feedback.className = 'reservation-feedback';
            feedback.innerHTML = '';
        }
    }
}

/* Limpieza de la Interfaz */
function resetReservationForm() {
    const form = document.getElementById('reservationForm');
    if (form) form.reset();
    
    const timeSlots = document.getElementById('resTimeSlots');
    if (timeSlots) {
        timeSlots.innerHTML = '<p class="text-secondary small w-100 text-center py-2 m-0">Selecciona un servicio y una fecha para ver horarios.</p>';
    }
}

/* Control Visual del Botón de Carga (Spinner) */
// Nota: reservation-flow.js debe invocar toggleLoadingState(true) al enviar y (false) al recibir respuesta.
window.toggleLoadingState = function(isLoading) {
    const btn = document.getElementById('resSubmitBtn');
    const text = document.getElementById('btnText');
    const loader = document.getElementById('btnLoader');
    
    if (btn && text && loader) {
        btn.disabled = isLoading;
        text.textContent = isLoading ? 'Procesando...' : 'Confirmar Reserva';
        if (isLoading) {
            loader.classList.remove('d-none');
        } else {
            loader.classList.add('d-none');
        }
    }
};