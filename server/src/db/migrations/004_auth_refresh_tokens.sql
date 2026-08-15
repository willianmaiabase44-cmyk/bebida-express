-- ============================================================
-- 004_auth_refresh_tokens.sql — Refresh tokens para autenticação própria
-- ============================================================
-- Permite rotação de access tokens sem novo login.
-- Cada refresh token é hasheado (SHA-256) antes de armazenar.
-- Revogação explícita no logout e expiração automática.
-- ============================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin', 'customer', 'motoboy')),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);