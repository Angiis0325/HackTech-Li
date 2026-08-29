/**
 * app.js
 * Lógica delegada del Modal de Reservas y utilidades UI.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Escuchar un evento personalizado que el archivo de Sebastián (reservation-flow.js) 
    // podría emitir cuando el backend confirme la reserva, para limpiar el formulario.
    window.addEventListener('reservationSuccess', () => {
        resetReservationForm();
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
        
        // Limpiamos los mensajes de error del backend al cerrar para que no aparezcan en la próxima apertura
        const feedback = document.getElementById('resFeedback');
        if (feedback) {
            feedback.style.display = 'none';
            feedback.className = 'reservation-feedback';
            feedback.innerHTML = '';
        }
    }
}

/* Función de apoyo para limpiar la UI tras integración exitosa */
function resetReservationForm() {
    const form = document.getElementById('reservationForm');
    if (form) form.reset();
    
    const timeSlots = document.getElementById('resTimeSlots');
    if (timeSlots) {
        timeSlots.innerHTML = '<p class="text-secondary small w-100 text-center py-2 m-0">Selecciona un servicio y una fecha para ver horarios.</p>';
    }
}