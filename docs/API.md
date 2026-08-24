# API Backend — HackTech Li (Grupo 2)

Documentación de referencia para la integración de:

* **Grupo 1:** IA + n8n + Telegram
* **Grupo 3:** Sitio web

El objetivo de este documento es permitir que ambos grupos puedan consumir e integrar el backend **sin necesidad de revisar el código fuente**.

---

# 1. Información general

## 1.1 Base URL

Para desarrollo local:

```text
http://localhost:4000
```

Todas las rutas descritas en este documento parten de esta URL.

Ejemplo:

```text
GET http://localhost:4000/api/health
```

## 1.2 Formato

Todas las solicitudes y respuestas utilizan **JSON**.

### Respuesta exitosa

Las respuestas exitosas están envueltas dentro de `data`:

```json
{
  "data": {
    "..."
  }
}
```

En endpoints que devuelven listas:

```json
{
  "data": [
    {}
  ]
}
```

### Respuesta de error

Los errores utilizan la siguiente estructura:

```json
{
  "error": {
    "message": "Descripción legible",
    "code": "CODIGO_DE_ERROR",
    "details": {}
  }
}
```

El campo `details` solamente aparece en errores de validación HTTP `400`.

---

# 2. Resumen de endpoints

| Método  | Endpoint                                        | Autenticación        | Uso                            |
| ------- | ----------------------------------------------- | -------------------- | ------------------------------ |
| `POST`  | `/api/auth/register`                            | Código de invitación | Crear admin staff              |
| `POST`  | `/api/auth/login`                               | No                   | Iniciar sesión                 |
| `GET`   | `/api/services`                                 | No                   | Consultar servicios            |
| `GET`   | `/api/reservations/availability`                | No                   | Consultar horarios disponibles |
| `POST`  | `/api/reservations/public`                      | No                   | Crear reserva pública          |
| `GET`   | `/api/reservations`                             | JWT admin/staff      | Consultar reservas             |
| `GET`   | `/api/reservations/:id`                         | JWT admin/staff      | Consultar reserva              |
| `PATCH` | `/api/reservations/:id/status`                  | JWT admin/staff      | Cambiar estado manualmente     |
| `GET`   | `/api/audit-logs`                               | JWT admin/staff      | Consultar auditoría            |
| `PATCH` | `/api/integrations/n8n/reservations/:id/status` | Token n8n            | Actualizar reserva desde n8n   |
| `GET`   | `/api/health`                                   | No                   | Verificar estado del backend   |

---

# 3. Autenticación

La autenticación mediante JWT se utiliza para el **panel administrativo** y para clientes que necesiten gestionar reservas como `admin` o `staff`.

> **Importante para Grupo 1:** la IA/n8n no utiliza este mecanismo para actualizar reservas. n8n utiliza el token de integración descrito en la sección 6.

---

## 3.1 Registrar usuario

### `POST /api/auth/register`

Crea un usuario con rol `admin` o `staff`.

El registro está protegido mediante el código de invitación definido en:

```text
ADMIN_INVITE_CODE
```

### Request

```json
{
  "name": "Sakura Li",
  "email": "sakura@fisioterapeutali.com",
  "password": "MinimoOchoCaracteres",
  "role": "admin",
  "inviteCode": "hacktech2026"
}
```

### Campos

| Campo        | Requerido           | Descripción                                              |
| ------------ | ------------------- | -------------------------------------------------------- |
| `name`       | Sí                  | Nombre del usuario                                       |
| `email`      | Sí                  | Correo electrónico                                       |
| `password`   | Sí                  | Contraseña de mínimo 8 caracteres                        |
| `role`       | No                  | `admin` o `staff`. Por defecto: `admin`                  |
| `inviteCode` | Según configuración | Código requerido si `ADMIN_INVITE_CODE` está configurado |

### Respuesta `201`

```json
{
  "data": {
    "user": {
      "id": 1,
      "name": "Sakura Li",
      "email": "sakura@fisioterapeutali.com",
      "role": "admin",
      "created_at": "..."
    },
    "token": "eyJhbGciOi..."
  }
}
```

### Errores

* `403 INVALID_INVITE_CODE`
* `409 EMAIL_ALREADY_EXISTS`

---

# 4. Iniciar sesión

## `POST /api/auth/login`

Permite obtener un JWT para acceder a las rutas administrativas.

### Request

```json
{
  "email": "sakura@fisioterapeutali.com",
  "password": "MinimoOchoCaracteres"
}
```

### Respuesta `200`

```json
{
  "data": {
    "user": {
      "id": 1,
      "name": "Sakura Li",
      "email": "sakura@fisioterapeutali.com",
      "role": "admin"
    },
    "token": "eyJhbGciOi..."
  }
}
```

### Error

```text
401 INVALID_CREDENTIALS
```

---

## 4.1 Uso del token

Las rutas protegidas requieren el siguiente encabezado:

```text
Authorization: Bearer <token>
```

El tiempo de expiración del token se configura mediante:

```text
JWT_EXPIRES_IN
```

Valor predeterminado:

```text
1d
```

---

# 5. Servicios

Los servicios son información pública utilizada principalmente por el **sitio web de Grupo 3**.

## `GET /api/services`

Devuelve los servicios activos disponibles para que el cliente pueda seleccionar uno al realizar una reserva.

### Autenticación

No requiere autenticación.

### Respuesta `200`

```json
{
  "data": [
    {
      "id": 1,
      "name": "Consulta de valoración",
      "description": "...",
      "duration_minutes": 45,
      "is_active": true
    }
  ]
}
```

---

# 6. Reservas públicas

Esta sección contiene los endpoints que utiliza principalmente el **sitio web de Grupo 3**.

El flujo público de reserva es:

```text
Consultar servicios
       ↓
Consultar disponibilidad
       ↓
Cliente selecciona horario
       ↓
Crear reserva
       ↓
Reserva queda en estado "pending"
       ↓
n8n procesa la reserva
       ↓
Google Calendar
       ↓
Reserva pasa a "confirmed"
```

---

## 6.1 Consultar disponibilidad

### `GET /api/reservations/availability`

Calcula los horarios disponibles dentro de un rango de fechas.

Debe utilizarse para **pintar el calendario y/o los slots disponibles en el sitio web antes de confirmar una reserva**.

### Query parameters

| Parámetro      | Requerido | Descripción                                                          |
| -------------- | --------- | -------------------------------------------------------------------- |
| `from`         | Sí        | Fecha/hora inicial en formato ISO datetime                           |
| `to`           | Sí        | Fecha/hora final. Máximo 31 días después de `from`                   |
| `serviceId`    | No        | ID del servicio. Si se proporciona, utiliza la duración del servicio |
| `slotMinutes`  | No        | Duración del slot entre 15 y 180 minutos. Default: 30                |
| `dayStartHour` | No        | Hora inicial. Default: 8                                             |
| `dayEndHour`   | No        | Hora final. Default: 18                                              |

> Si se proporciona `serviceId`, el valor de `slotMinutes` es ignorado.

### Ejemplo

```text
GET /api/reservations/availability?from=2026-08-25T00:00:00Z&to=2026-08-26T00:00:00Z&serviceId=1
```

### Respuesta `200`

```json
{
  "data": {
    "from": "2026-08-25T00:00:00.000Z",
    "to": "2026-08-26T00:00:00.000Z",
    "durationMinutes": 45,
    "totalSlots": 12,
    "slots": [
      {
        "startTime": "2026-08-25T13:00:00.000Z",
        "endTime": "2026-08-25T13:45:00.000Z"
      }
    ]
  }
}
```

---

## 6.2 Crear reserva pública

### `POST /api/reservations/public`

Crea una reserva desde el sitio web.

La disponibilidad se vuelve a validar internamente al momento de crearla.

Si otro usuario ocupó el horario entre la consulta de disponibilidad y la creación de la reserva, el backend devuelve `409 SLOT_UNAVAILABLE`.

### Request

```json
{
  "fullName": "Cliente Ejemplo",
  "email": "cliente@correo.com",
  "phone": "3001234567",
  "serviceId": 1,
  "startTime": "2026-08-25T13:00:00Z",
  "endTime": "2026-08-25T13:45:00Z",
  "notes": "Opcional, máx 500 caracteres"
}
```

### Respuesta `201`

```json
{
  "data": {
    "reservation": {
      "id": 10,
      "status": "pending",
      "start_time": "...",
      "end_time": "..."
    },
    "client": {
      "id": 3,
      "full_name": "Cliente Ejemplo",
      "email": "cliente@correo.com"
    },
    "service": {
      "id": 1,
      "name": "Consulta de valoración",
      "durationMinutes": 45
    }
  }
}
```

### Errores

```text
404 SERVICE_NOT_FOUND
409 SLOT_UNAVAILABLE
400 INVALID_TIME_RANGE
```

### Regla importante

La reserva **siempre nace en estado `pending`**.

El sitio web **no debe cambiarla directamente a `confirmed`**.

El cambio a `confirmed`, junto con la creación del evento real en Google Calendar, lo realiza **n8n mediante el endpoint de integración** descrito en la sección 8.

---

# 7. Gestión administrativa

Las siguientes rutas están destinadas al **panel administrativo de Grupo 3** y a clientes autorizados como `admin` o `staff`.

Todas requieren:

```text
Authorization: Bearer <token>
```

---

## 7.1 Listar reservas

### `GET /api/reservations`

Permite consultar las reservas existentes.

### Query parameters opcionales

```text
date=YYYY-MM-DD
status=pending|confirmed|cancelled|completed
```

Ejemplo:

```text
GET /api/reservations?status=pending
```

---

## 7.2 Consultar una reserva

### `GET /api/reservations/:id`

Devuelve el detalle de una reserva específica.

Ejemplo:

```text
GET /api/reservations/10
```

---

## 7.3 Cambiar estado manualmente

### `PATCH /api/reservations/:id/status`

Permite cambiar manualmente el estado de una reserva desde el panel administrativo.

### Request

```json
{
  "status": "confirmed"
}
```

Estados disponibles:

```text
pending
confirmed
cancelled
completed
```

> Este endpoint está pensado para el panel administrativo.
> **n8n debe utilizar su endpoint específico de integración**, descrito en la sección 8.

---

## 7.4 Consultar auditoría

### `GET /api/audit-logs?limit=100`

Devuelve el historial de acciones realizadas en el sistema.

Incluye acciones como:

* Login.
* Creación de reservas.
* Cambios de estado.
* Acciones realizadas por usuarios.
* Acciones realizadas públicamente.
* Acciones realizadas mediante integración.

El origen de la acción puede ser:

```text
user
public
integration
```

Es útil para:

* Panel administrativo.
* Seguimiento de reservas.
* Depuración de n8n.
* Depuración de la integración con Telegram.

---

# 8. Integración n8n → Backend

Esta sección está destinada principalmente al **Grupo 1**.

## 8.1 Endpoint de actualización de reservas

### `PATCH /api/integrations/n8n/reservations/:id/status`

Este es el **único endpoint de escritura que n8n utiliza para modificar reservas**.

n8n **no utiliza JWT** para esta operación.

En su lugar utiliza un token fijo configurado mediante:

```text
N8N_WEBHOOK_TOKEN
```

Esto permite que n8n pueda integrarse con el backend sin depender de un login de usuario.

### Principio del flujo

```text
IA interpreta
     ↓
Sistema valida
     ↓
n8n orquesta
     ↓
API autorizada ejecuta
```

---

## 8.2 Header requerido

```text
x-integration-token: <valor de N8N_WEBHOOK_TOKEN>
```

---

## 8.3 Request

```json
{
  "status": "confirmed",
  "calendarEventId": "abc123",
  "externalReference": "cal-sync-01",
  "message": "Creado por workflow n8n"
}
```

### Campos

| Campo               | Requerido | Descripción                                          |
| ------------------- | --------- | ---------------------------------------------------- |
| `status`            | Sí        | `confirmed`, `cancelled` o `completed`               |
| `calendarEventId`   | No        | ID del evento creado en Google Calendar              |
| `externalReference` | No        | Referencia externa                                   |
| `message`           | No        | Mensaje almacenado únicamente en el log de auditoría |

---

## 8.4 Respuesta `200`

```json
{
  "data": {
    "id": 10,
    "status": "confirmed",
    "calendar_event_id": "abc123",
    "external_reference": "cal-sync-01",
    "synced_at": "2026-08-25T13:05:00.000Z",
    "updated_at": "2026-08-25T13:05:00.000Z"
  }
}
```

---

## 8.5 Errores

```text
401 INVALID_INTEGRATION_TOKEN
404 RESERVATION_NOT_FOUND
503 INTEGRATION_NOT_CONFIGURED
```

`INTEGRATION_NOT_CONFIGURED` ocurre cuando:

```text
N8N_WEBHOOK_TOKEN
```

no está configurado en `.env`.

---

# 9. Flujo recomendado para n8n

El flujo recomendado para el Grupo 1 es:

```text
1. Nueva reserva
       ↓
2. Reserva en estado "pending"
       ↓
3. n8n consulta reservas pendientes
       ↓
4. IA / reglas de negocio validan la información
       ↓
5. n8n crea evento en Google Calendar
       ↓
6. n8n obtiene calendarEventId
       ↓
7. PATCH /api/integrations/n8n/reservations/:id/status
       ↓
8. Reserva pasa a "confirmed"
       ↓
9. n8n notifica al administrador por Telegram
```

Actualmente, para detectar nuevas reservas, n8n debe utilizar **polling**.

Puede consultar:

```text
GET /api/reservations?status=pending
```

Este endpoint requiere un token JWT de usuario con rol `admin` o `staff`.

> A futuro podría implementarse un webhook saliente del backend hacia n8n para evitar el polling.

---

# 10. Health Check

## `GET /api/health`

Permite comprobar si el backend y la base de datos están funcionando.

No requiere autenticación.

### Respuesta `200`

```json
{
  "data": {
    "status": "ok",
    "uptimeSeconds": 123.4,
    "dbTime": "2026-08-25T12:00:00.000Z"
  }
}
```

Puede utilizarse desde:

* n8n.
* Herramientas de monitoreo.
* Pruebas del backend.
* Diagnóstico de disponibilidad del sistema.

---

# 11. Códigos de error

| Código                       | HTTP | Descripción                                |
| ---------------------------- | ---: | ------------------------------------------ |
| `VALIDATION_ERROR`           |  400 | El body o query no cumple el esquema       |
| `INVALID_TIME_RANGE`         |  400 | `endTime <= startTime` o `to <= from`      |
| `RANGE_TOO_LARGE`            |  400 | Rango de disponibilidad superior a 31 días |
| `INVALID_DAY_WINDOW`         |  400 | `dayEndHour <= dayStartHour`               |
| `UNAUTHORIZED`               |  401 | JWT faltante o inválido                    |
| `INVALID_CREDENTIALS`        |  401 | Credenciales de login incorrectas          |
| `INVALID_INTEGRATION_TOKEN`  |  401 | Token de integración n8n incorrecto        |
| `FORBIDDEN`                  |  403 | Rol no autorizado                          |
| `INVALID_INVITE_CODE`        |  403 | Código de invitación incorrecto            |
| `SERVICE_NOT_FOUND`          |  404 | Servicio inexistente o inactivo            |
| `RESERVATION_NOT_FOUND`      |  404 | Reserva inexistente                        |
| `ROUTE_NOT_FOUND`            |  404 | Ruta inexistente                           |
| `EMAIL_ALREADY_EXISTS`       |  409 | Email ya registrado                        |
| `SLOT_UNAVAILABLE`           |  409 | Horario ocupado                            |
| `INTEGRATION_NOT_CONFIGURED` |  503 | Falta `N8N_WEBHOOK_TOKEN` en `.env`        |
| `INTERNAL_ERROR`             |  500 | Error no controlado                        |

---

# 12. Guía rápida para Grupo 3 — Sitio web

El flujo principal del sitio web es:

```text
GET /api/services
        ↓
Mostrar servicios
        ↓
GET /api/reservations/availability
        ↓
Mostrar calendario / horarios
        ↓
Cliente selecciona horario
        ↓
POST /api/reservations/public
        ↓
Reserva creada como "pending"
        ↓
n8n procesa la reserva
        ↓
Reserva pasa a "confirmed"
```

### Endpoints principales para Grupo 3

```text
GET  /api/services
GET  /api/reservations/availability
POST /api/reservations/public
```

Para el panel administrativo:

```text
POST  /api/auth/login
GET   /api/reservations
GET   /api/reservations/:id
PATCH /api/reservations/:id/status
GET   /api/audit-logs
```

---

# 13. Guía rápida para Grupo 1 — IA + n8n + Telegram

El flujo principal es:

```text
Reserva pública
       ↓
status = pending
       ↓
n8n consulta:
GET /api/reservations?status=pending
       ↓
IA / reglas de negocio
       ↓
Google Calendar
       ↓
PATCH /api/integrations/n8n/reservations/:id/status
       ↓
status = confirmed
       ↓
Telegram
```

### Endpoints principales para Grupo 1

Consulta de reservas:

```text
GET /api/reservations?status=pending
```

Actualización mediante integración:

```text
PATCH /api/integrations/n8n/reservations/:id/status
```

Health check:

```text
GET /api/health
```

---

# 14. Reglas importantes de integración

## Reserva pública

El sitio web crea la reserva mediante:

```text
POST /api/reservations/public
```

La reserva queda inicialmente:

```text
pending
```

## Confirmación

La confirmación mediante Google Calendar **no debe realizarse directamente desde el sitio web**.

Debe seguir el flujo:

```text
Sitio web
   ↓
Backend
   ↓
pending
   ↓
n8n
   ↓
Google Calendar
   ↓
Backend
   ↓
confirmed
```

## n8n

n8n utiliza:

```text
x-integration-token
```

y **no utiliza JWT** para actualizar una reserva mediante su endpoint de integración.

## Panel administrativo

El panel administrativo utiliza:

```text
Authorization: Bearer <token>
```

y requiere un usuario con rol:

```text
admin
```

o:

```text
staff
```

---

# 15. Funcionalidades pendientes

Las siguientes funcionalidades **todavía no están implementadas en el backend**.

## 15.1 Reprogramación/cancelación completa

Actualmente se puede cambiar el estado de una reserva, pero no modificar:

```text
start_time
end_time
```

con una revalidación completa de disponibilidad.

---

## 15.2 CRUD de servicios

Actualmente los servicios solamente tienen lectura pública.

No existe todavía un CRUD completo para:

* Crear servicios.
* Editar servicios.
* Desactivar servicios.

---

## 15.3 Resumen para el panel administrativo

Todavía no existe un endpoint específico para obtener información resumida como:

* Reservas de hoy.
* Próximas reservas.
* Reservas pendientes.
* Reservas confirmadas.

Actualmente esta información debe obtenerse combinando:

```text
GET /api/reservations
```

---

## 15.4 Webhook saliente hacia n8n

Actualmente el backend **no envía automáticamente un webhook a n8n cuando se crea una reserva**.

Por ahora, n8n debe utilizar polling mediante:

```text
GET /api/reservations?status=pending
```

A futuro se puede implementar:

```text
Backend
   ↓
Webhook
   ↓
n8n
```

para eliminar la necesidad de polling.

---

# 16. Estado actual de la API

La API actualmente permite:

* Autenticación de usuarios.
* Gestión de usuarios admin/staff.
* Consulta pública de servicios.
* Consulta de disponibilidad.
* Creación pública de reservas.
* Gestión administrativa de reservas.
* Cambio de estados.
* Integración con n8n.
* Registro de auditoría.
* Health check.
* Integración prevista con Google Calendar mediante n8n.
* Integración prevista con Telegram mediante n8n.

Las funcionalidades indicadas en la sección **15. Funcionalidades pendientes** todavía no forman parte de la API disponible.
