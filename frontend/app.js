/**
 * app.js
 * Lógica delegada del Modal de Reservas.
 * Nota: La navegación móvil y el scroll-spy ahora son manejados nativamente por Bootstrap 5.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inicializaciones adicionales si son requeridas en el futuro
});

/* Apertura y Cierre del Modal conectando con reservation-flow.js */
function openReservationModal(serviceName = null) {
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
        modalBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden'; // Evitar scroll de fondo
    }

    // Llamar al disparador de la lógica de Sebastián
    if (typeof window.onReservationModalOpen === 'function') {
        window.onReservationModalOpen(serviceName);
    }
}

function closeReservationModal(event = null) {
    // Si la llamada proviene del click event en el backdrop,
    // solo se ignora si se hizo clic explícitamente en la tarjeta modal interna.
    if (event && event.target && event.currentTarget && event.target !== event.currentTarget) {
        return;
    }

    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
        modalBackdrop.classList.remove('active');
        document.body.style.overflow = ''; // Restaurar scroll
    }
}