-- =========================================================
-- 003_token_revocations.sql
-- HackTech Li - Grupo 2 (Backend, BD y seguridad)
-- Permite invalidar un JWT antes de su expiración natural
-- (logout real). Cada token incluye un claim "jti" único;
-- al hacer logout, ese jti queda aquí hasta que el token
-- hubiera expirado de todas formas.
-- =========================================================

BEGIN;

CREATE TABLE IF NOT EXISTS token_revocations (
    jti         UUID PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    revoked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);

-- Usado por requireAuth en cada request autenticado: debe ser rápido.
CREATE INDEX IF NOT EXISTS idx_token_revocations_expires_at
    ON token_revocations (expires_at);

COMMIT;
