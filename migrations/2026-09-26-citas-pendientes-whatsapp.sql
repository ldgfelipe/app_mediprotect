ALTER TABLE citas
  ALTER COLUMN id_paciente DROP NOT NULL;

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS whatsapp_telefono VARCHAR(30),
  ADD COLUMN IF NOT EXISTS whatsapp_nombre VARCHAR(200),
  ADD COLUMN IF NOT EXISTS whatsapp_medico_nombre VARCHAR(200),
  ADD COLUMN IF NOT EXISTS whatsapp_opciones JSONB;

CREATE INDEX IF NOT EXISTS idx_citas_pendientes_whatsapp
  ON citas (estado, created_at)
  WHERE estado = 'PENDIENTE_DE_COORDINACION' AND fecha_hora IS NULL;
