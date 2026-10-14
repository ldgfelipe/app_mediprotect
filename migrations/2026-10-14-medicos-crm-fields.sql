-- Campos del CRM (formato de captura) que faltaban en la tabla medicos.
-- Aditivo e idempotente: no rompe datos ni columnas existentes.

ALTER TABLE medicos
  ADD COLUMN IF NOT EXISTS comision_por_cita    DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS convenio_firmado     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_firma_convenio DATE,
  ADD COLUMN IF NOT EXISTS fecha_afiliacion     DATE,
  ADD COLUMN IF NOT EXISTS advertencias         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notas                TEXT,
  ADD COLUMN IF NOT EXISTS servicios            JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS idiomas              JSONB DEFAULT '["Español"]'::jsonb,
  ADD COLUMN IF NOT EXISTS perfil_url_path      TEXT;

-- Bitácora de importaciones masivas de médicos por archivo
CREATE TABLE IF NOT EXISTS medicos_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID,
    archivo VARCHAR(255),
    total INTEGER DEFAULT 0,
    insertados INTEGER DEFAULT 0,
    actualizados INTEGER DEFAULT 0,
    errores INTEGER DEFAULT 0,
    detalle JSONB,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medicos_import_batches_creado ON medicos_import_batches(creado_en DESC);
