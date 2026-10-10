-- Tabla de log de sincronización de médicos
CREATE TABLE IF NOT EXISTS medicos_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'upserted', 'updated', 'created', 'error', 'skipped'
    mensaje TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    duracion_ms INTEGER,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medicos_sync_log_slug ON medicos_sync_log(slug);
CREATE INDEX IF NOT EXISTS idx_medicos_sync_log_creado ON medicos_sync_log(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_medicos_sync_log_status ON medicos_sync_log(status);