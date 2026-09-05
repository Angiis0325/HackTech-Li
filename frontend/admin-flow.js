document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
});

function checkAdminAuth() {
    const isAuth = sessionStorage.getItem('fisio_admin_auth') === 'true';
    const loginSection = document.getElementById('adminLoginSection');
    const dashboardContent = document.getElementById('adminDashboardContent');

    if (isAuth) {
        if (loginSection) loginSection.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';
        loadAdminReservations();
    } else {
        if (loginSection) loginSection.style.display = 'flex';
        if (dashboardContent) dashboardContent.style.display = 'none';
    }
}

function handleAdminLogin(event) {
    event.preventDefault();
    const passInput = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');

    const ADMIN_PASSWORD = '1234'; 

    if (passInput === ADMIN_PASSWORD) {
        sessionStorage.setItem('fisio_admin_auth', 'true');
        document.getElementById('adminPassword').value = '';
        if (errorDiv) errorDiv.style.display = 'none';
        checkAdminAuth();
    } else {
        if (errorDiv) {
            errorDiv.textContent = 'Contraseña incorrecta. Intenta de nuevo.';
            errorDiv.style.display = 'block';
        }
    }
}

function handleAdminLogout() {
    sessionStorage.removeItem('fisio_admin_auth');
    checkAdminAuth();
}

let cachedReservations = [];

async function loadAdminReservations() {
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary py-5"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Cargando listado de reservas...</td></tr>`;

    try {
        const response = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/reservations`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        const result = await response.json();
        cachedReservations = result.data || result || [];

        if (cachedReservations.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary py-5">No hay reservas registradas en el sistema.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        cachedReservations.forEach(res => {
            const tr = document.createElement('tr');
            
            const resId = res.id || res._id;
            const fullName = res.fullName || res.nombre || 'Sin nombre';
            const email = res.email || res.correo || 'Sin correo';
            const serviceName = res.serviceName || res.servicio || `Servicio #${res.serviceId || 'N/A'}`;
            const phone = res.phone || res.telefono || 'N/A';
            
            const rawDate = res.startTime || res.fecha;
            const formattedDate = rawDate ? formatDateTime(rawDate) : 'Fecha no especificada';

            const files = res.documents || res.archivos || [];
            const filesBadge = files.length > 0 
                ? `<span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">${files.length} archivo(s)</span>` 
                : `<span class="badge bg-secondary-subtle text-secondary px-2 py-1">Ninguno</span>`;

            tr.innerHTML = `
                <td class="ps-4">
                    <div class="fw-bold text-dark">${fullName}</div>
                    <div class="small text-secondary">${email}</div>
                </td>
                <td><span class="fw-medium">${serviceName}</span></td>
                <td><span class="text-secondary">${formattedDate}</span></td>
                <td><span class="text-secondary">${phone}</span></td>
                <td>${filesBadge}</td>
                <td class="text-center pe-4">
                    <button class="btn btn-outline-danger btn-sm rounded-pill px-3 shadow-none" onclick="deleteReservation(${resId})" title="Eliminar reserva">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error al cargar administración:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-5">Error de conexión con el servidor. Asegúrate de que el backend esté activo.</td></tr>`;
    }
}

async function deleteReservation(id) {
    if (!id) {
        alert('ID de reserva no válido.');
        return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar esta reserva del sistema?')) {
        return;
    }

    try {
        const response = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/reservations/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Error al eliminar (HTTP ${response.status})`);
        }

        alert('Reserva eliminada con éxito.');
        loadAdminReservations();
    } catch (error) {
        console.error("Error al eliminar reserva:", error);
        alert('No se pudo eliminar la reserva. Verifica la conexión con el servidor.');
    }
}

function exportReservationsCSV() {
    if (!cachedReservations || cachedReservations.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,ID,Paciente,Correo,Telefono,Servicio,Fecha\n";

    cachedReservations.forEach(res => {
        const id = res.id || '';
        const name = `"${(res.fullName || res.nombre || '').replace(/"/g, '""')}"`;
        const email = `"${(res.email || res.correo || '').replace(/"/g, '""')}"`;
        const phone = `"${(res.phone || res.telefono || '').replace(/"/g, '""')}"`;
        const service = `"${(res.serviceName || res.servicio || '').replace(/"/g, '""')}"`;
        const date = `"${(res.startTime || res.fecha || '')}"`;

        csvContent += [id, name, email, phone, service, date].join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reservas_fisioterapia_li.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('es-CO', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}