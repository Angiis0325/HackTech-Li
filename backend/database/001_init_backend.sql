-- =========================================================
-- 001_init_backend.sql
-- HackTech Li - Grupo 2 (Backend, BD y seguridad)
-- Esquema base: usuarios administrativos, clientes, servicios
-- y reservas. Corresponde a lo que ya consumen los repositories
-- en backend/src/repositories/*.js
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- Extensión útil para futuros índices/búsquedas (opcional)
-- ---------------------------------------------------------
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------
-- Tabla: users (administradores / staff que usan el sistema)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(120) NOT NULL,
    email          VARCHAR(160) NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    role           VARCHAR(20) NOT NULL DEFAULT 'staff'
                   CHECK (role IN ('admin', 'staff')),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- Tabla: clients (clientes que reservan desde el sitio web)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id             SERIAL PRIMARY KEY,
    full_name      VARCHAR(120) NOT NULL,
    email          VARCHAR(160) NOT NULL UNIQUE,
    phone          VARCHAR(30),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- Tabla: services (servicios ofrecidos por la fisioterapeuta)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(120) NOT NULL,
    description      TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- Tabla: reservations (núcleo del flujo obligatorio)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations (
    id                   SERIAL PRIMARY KEY,
    client_id            INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    service_id           INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    start_time           TIMESTAMPTZ NOT NULL,
    end_time             TIMESTAMPTZ NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    source               VARCHAR(20) NOT NULL DEFAULT 'web',
    notes                VARCHAR(500),
    -- Campos que llena la integración con n8n / Google Calendar
    calendar_event_id    VARCHAR(255),
    external_reference   VARCHAR(255),
    synced_at            TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT reservations_time_check CHECK (end_time > start_time)
);

-- Índices para validar disponibilidad rápido (usados por hasOverlap / listBusyIntervals)
CREATE INDEX IF NOT EXISTS idx_reservations_time_range
    ON reservations (start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_reservations_status
    ON reservations (status);

CREATE INDEX IF NOT EXISTS idx_reservations_client
    ON reservations (client_id);

CREATE INDEX IF NOT EXISTS idx_reservations_service
    ON reservations (service_id);

-- ---------------------------------------------------------
-- Trigger genérico para mantener updated_at al día
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
CREATE TRIGGER trg_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reservations_updated_at ON reservations;
CREATE TRIGGER trg_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;