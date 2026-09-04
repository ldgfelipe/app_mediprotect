-- ============================================================
-- MIGRACION: Cache de CURP para no consumir tickets de la API
-- Fecha: 2026-08-28
-- ============================================================

CREATE TABLE IF NOT EXISTS curp_cache (
  curp VARCHAR(18) PRIMARY KEY,
  datos JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curp_cache_created ON curp_cache(created_at);