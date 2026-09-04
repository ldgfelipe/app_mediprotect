-- ============================================================
-- MIGRACION: Confirmacion de correo electronico
-- Fecha: 2026-09-01
-- ============================================================

-- Columna de confirmacion en medicos
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS email_confirmado BOOLEAN DEFAULT false;

-- Columna de confirmacion en pacientes
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS email_confirmado BOOLEAN DEFAULT false;

-- Tabla de tokens de confirmacion
CREATE TABLE IF NOT EXISTS email_confirmacion_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL,
  tipo_usuario VARCHAR(20) NOT NULL, -- 'medico' o 'paciente'
  email VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expira_en TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_confirmacion_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_usuario ON email_confirmacion_tokens(id_usuario, tipo_usuario);