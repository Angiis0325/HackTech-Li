/**
 * app.js
 * Lógica de navegación del sitio y control del Modal de Reservas.
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initMobileMenu();
});

/* Control de Scroll Activo en Navbar */
function initNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        const scrollPosition = window.scrollY + 200;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

/* Control Menú Hamburguesa en Móviles */
function initMobileMenu() {
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-xmark');
            }
        });

        navLinks.querySelectorAll('a, button').forEach(item => {
            item.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = mobileToggle.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-xmark');
                }
            });
        });
    }
}

/* Apertura y Cierre del Modal conectando con reservation-flow.js */
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

function closeReservationModal(event) {
    if (event && event.target && event.target.id !== 'modalBackdrop') {
        return;
    }

    const modalBackdrop = document.getElementById('modalBackdrop');
    if (modalBackdrop) {
        modalBackdrop.classList.remove('active');
        document.body.style.overflow = '';
    }
}