function openReservationModal(serviceName = '') {
    const modal = document.getElementById('reservationModal');
    modal.style.display = 'flex';
    if (serviceName) {
        document.getElementById('serviceSelect').value = serviceName;
    }
}

function closeReservationModal() {
    const modal = document.getElementById('reservationModal');
    modal.style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('reservationModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};