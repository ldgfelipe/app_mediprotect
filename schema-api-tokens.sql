-- ============================================
-- Migracion: Tokens API para conexiones externas
-- ============================================

CREATE TABLE IF NOT EXISTS api_tokens (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  token_preview VARCHAR(20) NOT NULL,
  permisos JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  ultimo_uso TIMESTAMP WITH TIME ZONE,
  creado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_activo ON api_tokens (activo);
