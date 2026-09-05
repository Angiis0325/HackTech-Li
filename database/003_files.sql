-- =========================================================
-- 003_files.sql
-- HackTech Li - Metadata for private uploaded files.
-- =========================================================

BEGIN;

CREATE TABLE IF NOT EXISTS files (
    id              SERIAL PRIMARY KEY,
    reservation_id  INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    uploaded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    category        VARCHAR(40) NOT NULL
                    CHECK (category IN ('medical_history', 'client_attachment')),
    original_name   VARCHAR(255) NOT NULL,
    storage_name    VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(120) NOT NULL,
    size_bytes      INTEGER NOT NULL CHECK (size_bytes > 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_reservation
    ON files (reservation_id);

CREATE INDEX IF NOT EXISTS idx_files_created_at
    ON files (created_at DESC);

COMMIT;
