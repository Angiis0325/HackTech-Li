document.addEventListener('DOMContentLoaded', () => {
    // Menu Hamburguesa Responsive
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }

    // Modal de Reservas
    const modal = document.getElementById('reservationModal');
    const openModalNav = document.getElementById('openModalNav');
    const openModalHero = document.getElementById('openModalHero');
    const closeModal = document.getElementById('closeModal');
    const cancelReservation = document.getElementById('cancelReservation');
    const modalOverlay = document.getElementById('modalOverlay');
    const serviceBtns = document.querySelectorAll('.service-btn');
    const resServiceSelect = document.getElementById('resService');

    const showModal = (serviceName = '') => {
        if (modal) {
            if (serviceName && resServiceSelect) {
                resServiceSelect.value = serviceName;
            }
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
        }
    };

    const hideModal = () => {
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    };

    if (openModalNav) openModalNav.addEventListener('click', () => showModal());
    if (openModalHero) openModalHero.addEventListener('click', () => showModal());
    if (closeModal) closeModal.addEventListener('click', hideModal);
    if (cancelReservation) cancelReservation.addEventListener('click', hideModal);
    if (modalOverlay) modalOverlay.addEventListener('click', hideModal);

    serviceBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const service = e.target.getAttribute('data-service');
            showModal(service);
        });
    });

    // Manejo de Formularios
    const reservationForm = document.getElementById('reservationForm');
    if (reservationForm) {
        reservationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Solicitud de reserva enviada correctamente.');
            hideModal();
            reservationForm.reset();
        });
    }

    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Mensaje de contacto enviado con éxito.');
            contactForm.reset();
        });
    }
});