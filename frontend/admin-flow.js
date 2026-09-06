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

// El backend exige correo + contraseña (no admite solo contraseña), así
// que para mantener el login de un único campo se usa siempre este
// correo fijo -el del usuario admin creado por npm run seed- por
// detrás. La contraseña real sigue siendo la que tenga esa cuenta en la
// base de datos (ver nota importante: el backend exige mínimo 8
// caracteres, así que "1234" tal cual no es válido).
const ADMIN_EMAIL = 'admin@fisioterapeutali.com';

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

    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('loginError');
    const submitBtn = document.getElementById('adminLoginBtn');

    if (errorDiv) errorDiv.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;

    try {
        const res = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password })
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
        // El backend no aplica ningún ORDER BY (ver listReservations en
        // reservation.repository.js), así que Postgres puede devolverlas
        // en cualquier orden. Se ordenan aquí por fecha de creación, de
        // la reserva más reciente a la más antigua.
        cachedReservations = (result.data || []).sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        if (cachedReservations.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-secondary py-5">No hay reservas registradas en el sistema.</td></tr>`;
            return;
        }

        // El listado de reservas no trae los archivos adjuntos (la consulta
        // no los incluye) -por eso nunca aparecían, aunque sí se hubieran
        // subido-. Sí existe un endpoint por reserva
        // (GET /api/files/reservations/:id), así que los pedimos todos en
        // paralelo y los guardamos junto a cada reserva antes de dibujar la tabla.
        await Promise.all(
            cachedReservations.map(async (res) => {
                try {
                    const filesRes = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/files/reservations/${res.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (filesRes.ok) {
                        const filesJson = await filesRes.json();
                        res.files = filesJson.data || [];
                    } else {
                        const errorJson = await filesRes.json().catch(() => null);
                        console.error(
                            `No se pudieron cargar los archivos de la reserva #${res.id}: HTTP ${filesRes.status}`,
                            errorJson
                        );
                        res.files = [];
                    }
                } catch (fileError) {
                    console.error(`Error de red al pedir archivos de la reserva #${res.id}:`, fileError);
                    res.files = [];
                }
            })
        );

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

            const files = res.files || [];
            const filesBadge = files.length > 0
                ? files
                    .map(
                        (f) => `
                    <button type="button" class="btn btn-outline-primary btn-sm rounded-pill px-2 py-0 mb-1 d-flex align-items-center gap-1 text-truncate" style="max-width: 170px;" title="Descargar ${escapeHtml(f.original_name)}" onclick="downloadReservationFile(${f.id})">
                        <i class="fa-solid fa-download"></i><span class="text-truncate">${escapeHtml(f.original_name)}</span>
                    </button>`
                    )
                    .join('')
                : `<span class="badge bg-secondary-subtle text-secondary px-2 py-1">Ninguno</span>`;

            const actionButtons = [];
            if (status === 'pending') {
                actionButtons.push(`<button class="btn btn-outline-success btn-sm rounded-pill px-3 shadow-none me-1" onclick="approveReservation(${resId})" title="Aprobar reserva">
                    <i class="fa-solid fa-check"></i>
                </button>`);
            }
            if (status === 'pending' || status === 'confirmed') {
                actionButtons.push(`<button class="btn btn-outline-danger btn-sm rounded-pill px-3 shadow-none" onclick="cancelReservation(${resId})" title="Cancelar reserva">
                    <i class="fa-solid fa-ban"></i>
                </button>`);
            }

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
                    ${actionButtons.length > 0 ? actionButtons.join('') : '<span class="text-secondary small">—</span>'}
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
 * Aprueba una reserva pendiente (PATCH /:id/status con status: "confirmed").
 */
async function approveReservation(id) {
    if (!id) {
        alert('ID de reserva no válido.');
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
            body: JSON.stringify({ status: 'confirmed' })
        });

        if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem(ADMIN_TOKEN_KEY);
            checkAdminAuth();
            return;
        }

        if (!response.ok) {
            throw new Error(`Error al aprobar (HTTP ${response.status})`);
        }

        loadAdminReservations();
    } catch (error) {
        console.error("Error al aprobar reserva:", error);
        alert('No se pudo aprobar la reserva. Verifica la conexión con el servidor.');
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

/**
 * Descarga un archivo adjunto (GET /api/files/:id/download, protegido).
 * Como la ruta exige el header Authorization, no sirve un <a href="...">
 * normal -el navegador no le agrega el token al navegar-; por eso se
 * pide con fetch() y se arma la descarga manualmente con un blob.
 */
async function downloadReservationFile(fileId) {
    const token = getAdminToken();
    if (!token) {
        checkAdminAuth();
        return;
    }

    try {
        const response = await fetch(`${RESERVATION_CONFIG.API_BASE_URL}/files/${fileId}/download`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem(ADMIN_TOKEN_KEY);
            checkAdminAuth();
            return;
        }

        if (!response.ok) {
            throw new Error(`Error al descargar (HTTP ${response.status})`);
        }

        // El backend ya manda el nombre real del archivo en el header
        // Content-Disposition (ver res.download() en file.controller.js);
        // se recupera de ahí en vez de pasarlo por separado.
        const disposition = response.headers.get('Content-Disposition') || '';
        const match = /filename[^;=\n]*=(?:UTF-8'')?["']?([^"';\n]+)["']?/i.exec(disposition);
        const filename = match ? decodeURIComponent(match[1]) : `archivo-${fileId}`;

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error al descargar archivo:', error);
        alert('No se pudo descargar el archivo. Verifica la conexión con el servidor.');
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('es-CO', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}
