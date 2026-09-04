/**
 * app.js
 * Lógica delegada del Modal de Reservas, animaciones SPA, modo oscuro, utilidades UI y manejo de archivos.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Escuchar el evento de éxito emitido por la lógica de integración
    window.addEventListener('reservationSuccess', () => {
        setTimeout(() => {
            closeReservationModal();
            resetReservationForm();
        }, 2500);
    });

    // Intersection Observer para animaciones SPA
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    revealElements.forEach(el => revealObserver.observe(el));

    // Lógica para el Modo Oscuro / Claro
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeIcon) themeIcon.className = 'fa-solid fa-sun text-warning';
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            let isDarkMode = document.body.classList.contains('dark-mode');
            if (isDarkMode) {
                localStorage.setItem('theme', 'dark');
                themeIcon.className = 'fa-solid fa-sun text-warning';
            } else {
                localStorage.setItem('theme', 'light');
                themeIcon.className = 'fa-solid fa-moon text-primary';
            }
        });
    }

    // Lógica interactiva para la carga múltiple de documentos médicos
    setupFileUploadListener();
});

function setupFileUploadListener() {
    const resFile = document.getElementById('resFile');
    const resFileName = document.getElementById('resFileName');
    const fileUploadIcon = document.getElementById('fileUploadIcon');

    if (resFile && resFileName && fileUploadIcon) {
        resFile.addEventListener('change', function(e) {
            const filesCount = this.files.length;
            if (filesCount === 1) {
                resFileName.innerHTML = `<strong>${this.files[0].name}</strong> listo para enviar`;
                resFileName.classList.remove('text-secondary');
                resFileName.classList.add('text-success');
                fileUploadIcon.className = 'fa-solid fa-file-circle-check fs-2 text-success mb-2';
            } else if (filesCount > 1) {
                resFileName.innerHTML = `<strong>${filesCount} archivos</strong> seleccionados listos para enviar`;
                resFileName.classList.remove('text-secondary');
                resFileName.classList.add('text-success');
                fileUploadIcon.className = 'fa-solid fa-file-circle-check fs-2 text-success mb-2';
            } else {
                resFileName.innerHTML = `Selecciona o arrastra tus archivos aquí`;
                resFileName.classList.add('text-secondary');
                resFileName.classList.remove('text-success');
                fileUploadIcon.className = 'fa-solid fa-cloud-arrow-up fs-2 text-primary mb-2';
            }
        });
    }
}

/**
 * ELIMINADOR DE DUPLICADOS: 
 * Si `reservation-flow.js` inyecta un input de archivo extra al abrir el modal, 
 * esta función lo detecta y lo borra al instante para dejar solo nuestro diseño.
 */
function sanitizeDuplicateInputs() {
    const fileInputs = document.querySelectorAll('#reservationForm input[type="file"]');
    if (fileInputs.length > 1) {
        fileInputs.forEach(input => {
            // Si el input no es el nuestro (.file-upload-input), destruimos su contenedor
            if (!input.classList.contains('file-upload-input')) {
                const wrapper = input.closest('.mb-3') || input.parentElement;
                if (wrapper && wrapper !== input) {
                    wrapper.remove();
                } else {
                    input.remove();
                }
            }
        });
    }
}

/* Apertura y Cierre del Modal */
function openReservationModal(serviceName = null) {
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
        modalBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Limpiamos cualquier elemento duplicado que haya metido el script de Juan Sebastián
    setTimeout(sanitizeDuplicateInputs, 50);

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

    const resFileName = document.getElementById('resFileName');
    const fileUploadIcon = document.getElementById('fileUploadIcon');
    if (resFileName && fileUploadIcon) {
        resFileName.innerHTML = `Selecciona o arrastra tus archivos aquí`;
        resFileName.classList.add('text-secondary');
        resFileName.classList.remove('text-success');
        fileUploadIcon.className = 'fa-solid fa-cloud-arrow-up fs-2 text-primary mb-2';
    }
}

/* Control Visual del Botón de Carga (Spinner) */
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