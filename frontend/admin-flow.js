/**
 * admin-flow.js
 *
 * ANTES: el "login" solo comparaba una contraseña fija ('1234') guardada
 * en el propio archivo y marcaba una bandera en sessionStorage -nunca
 * hablaba con el backend-. Por eso GET /api/reservations (que exige
 * requireAuth + rol admin/staff, ver backend/src/routes/reservation.routes.js)
 * siempre respondía 401, y el catch de loadAdminReservations() mostraba
 * "Error de conexión con el servidor" aunque el servidor sí respondía
 * -solo que rechazaba la petición por no traer ningún token-.
 *
 * AHORA: el login llama a POST /api/auth/login (email + password reales,
 * ver seed.js para las credenciales), guarda el JWT que devuelve, y lo
 * manda como header Authorization en cada llamada protegida.
 */

const ADMIN_TOKEN_KEY = 'fisio_admin_token';

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
});

function getAdminToken() {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

function checkAdminAuth() {
    const isAuth = Boolean(getAdminToken());
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

async function handleAdminLogin(event) {
    event.preventDefault();

    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');
    const submitBtn = document.getElementById('adminLoginBtn');

    if (errorDiv) errorDiv.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;

    try {
        const res = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
            const message =
                json && json.error && json.error.code === 'INVALID_CREDENTIALS'
                    ? 'Correo o contraseña incorrectos.'
                    : (json && json.error && json.error.message) || `Error HTTP ${res.status}`;
            throw new Error(message);
        }

        const { token, user } = json.data;

        // Solo admin/staff pueden ver el listado (ver authorizeRoles en
        // reservation.routes.js); si el backend permitiera otros roles,
        // igual bloqueamos aquí para no guardar un token que de todas
        // formas va a recibir 403 en cada llamada.
        if (user.role !== 'admin' && user.role !== 'staff') {
            throw new Error('Tu cuenta no tiene permisos de administrador o staff.');
        }

        sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
        document.getElementById('adminPassword').value = '';
        checkAdminAuth();
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message || 'No se pudo iniciar sesión.';
            errorDiv.style.display = 'block';
        }
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

function handleAdminLogout() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    checkAdminAuth();
}

let cachedReservations = [];

async function loadAdminReservations() {
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) return;

    const token = getAdminToken();
    if (!token) {
        checkAdminAuth();
        return;
    }

    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-5"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Cargando listado de reservas...</td></tr>`;

    try {
        const response = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/reservations`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // El token puede haber expirado (ver JWT_EXPIRES_IN en el backend) o
        // ser inválido; en ese caso no es un problema de conexión, hay que
        // pedir que inicie sesión de nuevo.
        if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem(ADMIN_TOKEN_KEY);
            checkAdminAuth();
            return;
        }

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        const result = await response.json();
        cachedReservations = result.data || [];

        if (cachedReservations.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-5">No hay reservas registradas en el sistema.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        cachedReservations.forEach(res => {
            const tr = document.createElement('tr');

            // Nombres reales que devuelve el backend (ver
            // repositories/reservation.repository.js: listReservations).
            const resId = res.id;
            const fullName = res.client_name || 'Sin nombre';
            const email = res.client_email || 'Sin correo';
            const serviceName = res.service_name || `Servicio #${res.service_id || 'N/A'}`;
            const phone = res.client_phone || 'N/A';
            const status = res.status || 'pending';

            const formattedDate = res.start_time ? formatDateTime(res.start_time) : 'Fecha no especificada';

            const statusBadges = {
                pending: '<span class="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">Pendiente</span>',
                confirmed: '<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">Confirmada</span>',
                cancelled: '<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">Cancelada</span>',
                completed: '<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1">Completada</span>'
            };

            // El listado no trae archivos adjuntos (la consulta no los
            // incluye); si en el futuro se agregan a la respuesta, esto
            // los mostrará automáticamente.
            const files = res.documents || res.files || [];
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
                <td>${statusBadges[status] || status}</td>
                <td class="text-center pe-4">
                    ${status === 'cancelled'
                        ? '<span class="text-secondary small">—</span>'
                        : `<button class="btn btn-outline-danger btn-sm rounded-pill px-3 shadow-none" onclick="cancelReservation(${resId})" title="Cancelar reserva">
                        <i class="fa-solid fa-ban"></i>
                    </button>`}
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error al cargar administración:", error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-5">Error de conexión con el servidor. Asegúrate de que el backend esté activo.</td></tr>`;
    }
}

/**
 * El backend no tiene un endpoint de borrado real (no existe DELETE
 * /reservations/:id) -solo PATCH /:id/status-, así que "eliminar" en
 * realidad cancela la reserva (transición de estado válida según
 * updateReservationStatusSchema).
 */
async function cancelReservation(id) {
    if (!id) {
        alert('ID de reserva no válido.');
        return;
    }

    if (!confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
        return;
    }

    const token = getAdminToken();
    if (!token) {
        checkAdminAuth();
        return;
    }

    try {
        const response = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/reservations/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'cancelled' })
        });

        if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem(ADMIN_TOKEN_KEY);
            checkAdminAuth();
            return;
        }

        if (!response.ok) {
            throw new Error(`Error al cancelar (HTTP ${response.status})`);
        }

        loadAdminReservations();
    } catch (error) {
        console.error("Error al cancelar reserva:", error);
        alert('No se pudo cancelar la reserva. Verifica la conexión con el servidor.');
    }
}

function exportReservationsCSV() {
    if (!cachedReservations || cachedReservations.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,ID,Paciente,Correo,Telefono,Servicio,Fecha,Estado\n";

    cachedReservations.forEach(res => {
        const id = res.id || '';
        const name = `"${(res.client_name || '').replace(/"/g, '""')}"`;
        const email = `"${(res.client_email || '').replace(/"/g, '""')}"`;
        const phone = `"${(res.client_phone || '').replace(/"/g, '""')}"`;
        const service = `"${(res.service_name || '').replace(/"/g, '""')}"`;
        const date = `"${(res.start_time || '')}"`;
        const status = `"${(res.status || '')}"`;

        csvContent += [id, name, email, phone, service, date, status].join(",") + "\n";
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
