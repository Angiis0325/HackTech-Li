-- =========================================================
-- 002_audit_and_integrations.sql
-- HackTech Li - Grupo 2 (Backend, BD y seguridad)
-- Registro de auditoría (operation_logs), usado por
-- backend/src/repositories/audit.repository.js para dejar
-- rastro de: login/registro, creación de reservas, cambios
-- de estado (admin y n8n).
-- =========================================================

BEGIN;

CREATE TABLE IF NOT EXISTS operation_logs (
    id          SERIAL PRIMARY KEY,
    -- Quién ejecutó la acción: 'user' | 'public' | 'integration'
    actor_type  VARCHAR(20) NOT NULL,
    -- Identificador libre del actor (id de usuario, email de cliente, "n8n", etc.)
    actor_id    VARCHAR(120),
    -- Acción realizada, ej: 'auth.login', 'reservation.created', 'reservation.status.updated'
    action      VARCHAR(120) NOT NULL,
    -- Entidad afectada, ej: 'user', 'reservation'
    entity      VARCHAR(60) NOT NULL,
    entity_id   VARCHAR(60),
    -- Contexto adicional en JSON (estado anterior/nuevo, origen, etc.)
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at
    ON operation_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operation_logs_entity
    ON operation_logs (entity, entity_id);

CREATE INDEX IF NOT EXISTS idx_operation_logs_action
    ON operation_logs (action);

-- Índice GIN opcional si luego se necesitan búsquedas dentro del metadata
CREATE INDEX IF NOT EXISTS idx_operation_logs_metadata
    ON operation_logs USING GIN (metadata);

-- ---------------------------------------------------------
-- Nota de seguridad (alineado con el punto 3 y 6 del plan):
-- La IA / n8n NUNCA escriben directamente en reservations.
-- Solo llegan por el endpoint de integración
-- (PATCH /api/integrations/n8n/reservations/:id/status)
-- protegido por el header x-integration-token, y cada cambio
-- queda registrado aquí con actor_type = 'integration'.
-- ---------------------------------------------------------

COMMIT;