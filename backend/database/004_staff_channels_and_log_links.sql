-- =========================================================
-- 004_staff_channels_and_log_links.sql
-- HackTech Li - Grupo 2 (Backend, BD y seguridad)
--
-- Agrega:
-- 1) user_services: tabla puente (many-to-many) entre el personal
--    (users: admin/staff) y los servicios que puede atender.
-- 2) reservations.assigned_user_id: qué miembro del personal atiende
--    cada reserva (referencia a users, nullable: no todas las
--    reservas necesitan asignación manual).
-- 3) client_channels: tabla puente entre clients y sus canales de
--    notificación (email/telegram/sms). Da soporte real a la
--    integración con n8n + Telegram (Grupo 1) sin forzar un solo
--    canal por cliente.
-- 4) operation_logs deja de ser un log "huérfano": se agregan FKs
--    reales hacia users (quién ejecutó la acción) y reservations
--    (sobre qué reserva, cuando aplica). actor_type/entity/
--    entity_id se mantienen para acciones que no calzan en
--    ninguna de las dos (ej. auth.login, client.registered).
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1) user_services (personal <-> servicios que puede atender)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_services (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id  INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_user_services_service
    ON user_services (service_id);

-- ---------------------------------------------------------
-- 2) reservations.assigned_user_id (quién atiende la cita)
-- ---------------------------------------------------------
ALTER TABLE reservations
    ADD COLUMN IF NOT EXISTS assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_assigned_user
    ON reservations (assigned_user_id);

-- ---------------------------------------------------------
-- 3) client_channels (cliente <-> canales de notificación)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_channels (
    id             SERIAL PRIMARY KEY,
    client_id      INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    channel_type   VARCHAR(20) NOT NULL CHECK (channel_type IN ('email', 'telegram', 'sms')),
    channel_value  VARCHAR(160) NOT NULL,
    is_primary     BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_client_channel UNIQUE (client_id, channel_type, channel_value)
);

CREATE INDEX IF NOT EXISTS idx_client_channels_client
    ON client_channels (client_id);

DROP TRIGGER IF EXISTS trg_client_channels_updated_at ON client_channels;
CREATE TRIGGER trg_client_channels_updated_at
    BEFORE UPDATE ON client_channels
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------
-- 4) operation_logs: FKs reales hacia users y reservations
-- ---------------------------------------------------------
ALTER TABLE operation_logs
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE operation_logs
    ADD COLUMN IF NOT EXISTS reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_operation_logs_user
    ON operation_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_operation_logs_reservation
    ON operation_logs (reservation_id);

-- Backfill best-effort de logs existentes que ya tenían el dato
-- disperso en actor_id/entity_id como texto (no rompe si no aplica).
UPDATE operation_logs
   SET user_id = actor_id::INTEGER
 WHERE actor_type = 'user'
   AND user_id IS NULL
   AND actor_id ~ '^\d+$';

UPDATE operation_logs
   SET reservation_id = entity_id::INTEGER
 WHERE entity = 'reservation'
   AND reservation_id IS NULL
   AND entity_id ~ '^\d+$';

COMMIT;
