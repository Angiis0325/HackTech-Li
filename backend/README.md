NPM INSTALL (crea el node modules)
npm run dev 
variables de coneccion en el env.
crear una base de datos llamada HackTech-Li en postgres sql con un user: user y con pasword: 123456789
falta crear semilla y verificar rutas. 

# Backend - HackTech Li

Backend base del Grupo 2 para el flujo principal del reto:

Cliente reserva -> backend valida disponibilidad -> guarda en BD -> deja datos listos para Calendar/n8n -> consulta por Telegram.

## Stack

- Node.js + Express
- PostgreSQL
- JWT (autenticacion)
- Zod (validaciones)

## Estructura

- `src/routes`: rutas API
- `src/controllers`: logica de endpoints
- `src/repositories`: acceso a base de datos
- `src/middlewares`: auth, validacion y errores
- `src/schemas`: contratos de entrada

## Requisitos

1. Tener Node.js 20+ instalado.
2. Tener PostgreSQL activo.
3. Ejecutar el SQL inicial en `../database/001_init_backend.sql`.
4. Ejecutar el SQL de integraciones/auditoria en `../database/002_audit_and_integrations.sql`.

## SQL para PostgreSQL (con tus credenciales)

Credenciales definidas:

- Usuario: `user`
- Password: `123456789`
- Base de datos: `HackTech-Li`

En PostgreSQL, ejecuta:

```sql
CREATE USER "user" WITH PASSWORD '123456789';
ALTER USER "user" WITH LOGIN;

CREATE DATABASE "HackTech-Li" OWNER "user";

GRANT ALL PRIVILEGES ON DATABASE "HackTech-Li" TO "user";
```

Luego corre el script de tablas y datos iniciales:

```sql
\c "HackTech-Li"
\i ../database/001_init_backend.sql
\i ../database/002_audit_and_integrations.sql
```

Cadena de conexion usada por el backend:

```env
DATABASE_URL=postgresql://user:123456789@localhost:5432/HackTech-Li
N8N_WEBHOOK_TOKEN=change_this_integration_token
```

## Setup

1. Copiar `.env.example` a `.env`.
2. Instalar dependencias:
   - `npm install`
3. Ejecutar migraciones:
   - `npm run migrate`
4. Levantar backend en desarrollo:
   - `npm run dev`

## Setup paso a paso (Windows, anti-errores)

1. Abrir VS Code en el workspace `HackTech-Li`.
2. Abrir una terminal nueva de PowerShell.
3. Ir a backend:
   - `cd C:\Users\kevin\Desktop\backend\HackTech-Li\backend`
4. Verificar Node:
   - `node -v`
5. Si `npm` no se reconoce en esta terminal:
   - `$env:Path = "C:\Program Files\nodejs;" + $env:Path`
   - `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force`
6. Instalar dependencias:
   - `npm install`
7. Ejecutar migraciones:
   - `npm run migrate`
8. Levantar backend:
   - `npm run dev`

Fallback si `npm` sigue sin reconocer en alguna terminal:

1. `node scripts/migrate.js`
2. `node scripts/dev.js`

`npm run dev` ahora libera automaticamente el puerto configurado (por defecto 4000)
antes de iniciar `nodemon`, para evitar errores `EADDRINUSE`.

## Endpoints base

- `GET /api/health`
- `GET /api/services` (public)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/reservations/public`
- `GET /api/reservations/availability` (public)
- `GET /api/reservations` (auth)
- `GET /api/reservations/:id` (auth)
- `PATCH /api/reservations/:id/status` (auth)
- `PATCH /api/integrations/n8n/reservations/:id/status` (token)
- `GET /api/audit-logs` (auth)
- `POST /api/files/public` (multipart, cliente)
- `POST /api/files/reservations/:reservationId` (multipart, auth; historia clínica)
- `GET /api/files/reservations/:reservationId` (auth)
- `GET /api/files/:id/download` (auth)

## Carga de archivos

Los archivos se guardan fuera de una carpeta pública y sus metadatos quedan en la tabla `files`.
Ejecuta `npm run migrate` para crearla. Los límites por defecto son 10 MB por archivo y 5 archivos por petición; se configuran con `MAX_FILE_SIZE_BYTES` y `MAX_FILES_PER_REQUEST`.

Para el cliente, usa `POST /api/files/public` como `multipart/form-data` y envía los campos `reservationId`, `email` y uno o más campos `files`. El correo debe coincidir con el correo de la reserva.

Para el personal clínico, usa `POST /api/files/reservations/:reservationId` con `Authorization: Bearer <token>`, uno o más campos `files` y el campo opcional `category`: `medical_history` (por defecto) o `client_attachment`. Los roles `doctor`, `staff` y `admin` tienen acceso a este apartado. Los tipos aceptados son PDF, JPG, PNG, WEBP y DOCX.

## Disponibilidad para frontend

Endpoint publico:

- `GET /api/reservations/availability`

Query params:

- `from` (ISO datetime, requerido)
- `to` (ISO datetime, requerido)
- `serviceId` (opcional, usa duracion del servicio)
- `slotMinutes` (opcional, default 30)
- `dayStartHour` (opcional, default 8)
- `dayEndHour` (opcional, default 18)

Ejemplo:

```text
GET /api/reservations/availability?from=2026-09-02T00:00:00Z&to=2026-09-03T00:00:00Z&serviceId=1&slotMinutes=30
```

## Pruebas automaticas basicas

Con backend corriendo en `http://localhost:4000`, ejecuta:

```bash
npm run test:smoke
```

La prueba cubre:

- Health check
- Registro de usuario
- Reserva publica
- Disponibilidad
- Webhook de integracion n8n
- Consulta de auditoria

## Contrato frontend (preguntas clave)

1. ¿Que datos necesita el backend para consultar disponibilidad?
   - `from` (ISO datetime), `to` (ISO datetime)
   - Opcional: `serviceId`, `slotMinutes`, `dayStartHour`, `dayEndHour`
   - Endpoint: `GET /api/reservations/availability`

2. ¿Que datos necesita para crear una reserva?
   - `fullName`, `email`, `phone`, `serviceId`, `startTime`, `endTime`
   - Opcional: `notes`
   - Endpoint: `POST /api/reservations/public`

3. ¿Como se identifica un servicio?
   - Por `id` numerico (`serviceId`)
   - El frontend obtiene servicios desde `GET /api/services`

4. ¿Como se identifica una reserva?
   - Por `id` numerico (`reservation.id`)

5. ¿Que respuesta devuelve el backend cuando consulta disponibilidad?
   - Objeto con `from`, `to`, `durationMinutes`, `slotMinutes`, `dayStartHour`, `dayEndHour`, `totalSlots`, `slots[]`
   - Cada slot tiene `startTime` y `endTime`

6. ¿Como informa el backend que una reserva fue creada correctamente?
   - HTTP `201`
   - `data.reservation` (incluye `id`, estado y horarios)
   - `data.client`
   - `data.service`

7. ¿Que errores puede devolver?
   - `400 VALIDATION_ERROR`
   - `400 INVALID_TIME_RANGE`
   - `400 INVALID_DAY_WINDOW`
   - `400 RANGE_TOO_LARGE`
   - `401 UNAUTHORIZED`
   - `401 INVALID_INTEGRATION_TOKEN`
   - `403 FORBIDDEN`
   - `404 ROUTE_NOT_FOUND`
   - `404 RESERVATION_NOT_FOUND`
   - `404 SERVICE_NOT_FOUND`
   - `409 SLOT_UNAVAILABLE`
   - `409 EMAIL_ALREADY_EXISTS`
   - `500 INTERNAL_ERROR`

8. ¿Quien valida que el horario siga disponible?
   - Backend

9. ¿Que parte de esta logica debe manejar el frontend?
   - Mostrar servicios y horarios disponibles
   - Recoger datos del cliente y de la reserva
   - Consumir endpoints y mostrar respuestas/errores

10. ¿Que parte NO debe duplicar el frontend?
   - La validacion real de disponibilidad
   - La regla anti-conflictos de reservas
   - Las validaciones de seguridad/autorizacion

## Estado de requisitos del backend

Cumplidos:

- RF03, RF04, RF05, RF06, RF09, RF10, RF11, RF13, RF14, RF15, RF16

Parciales:

- RF01 (gestion de clientes: hoy se cubre alta/actualizacion automatica via reserva, no CRUD administrativo completo)
- RF02 (gestion de servicios: listado publico activo implementado, falta CRUD administrativo completo)
- RF07 y RF08 (modificar/cancelar cubierto por cambio de estado, falta flujo de edicion detallada de fecha/hora para admin)
- RF12 (usuarios autorizados: registro/login y roles base listos, falta gestion administrativa completa de usuarios)

## Webhook seguro n8n

Header requerido:

- `x-integration-token: <N8N_WEBHOOK_TOKEN>`

Endpoint:

- `PATCH /api/integrations/n8n/reservations/:id/status`

Body ejemplo:

```json
{
   "status": "confirmed",
   "calendarEventId": "evt_12345",
   "externalReference": "n8n-run-001",
   "message": "Reserva sincronizada con Google Calendar"
}
```

## Siguiente integracion (n8n / Calendar)

Cuando una reserva pase a `confirmed`, n8n puede disparar:

1. Crear evento en Google Calendar.
2. Enviar confirmacion por correo.
3. Notificar por Telegram.

Eso se puede hacer consumiendo `GET /api/reservations` y `PATCH /api/reservations/:id/status`.
