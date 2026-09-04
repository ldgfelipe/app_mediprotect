-- ============================================
-- Migracion: Confirmacion SMS de telefono
-- ============================================

-- Columna telefono_confirmado en medicos
DO $$ BEGIN
  ALTER TABLE medicos ADD COLUMN IF NOT EXISTS telefono_confirmado BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Columna telefono_confirmado en pacientes
DO $$ BEGIN
  ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS telefono_confirmado BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Tabla de tokens de confirmacion SMS
CREATE TABLE IF NOT EXISTS sms_confirmacion_tokens (
  id SERIAL PRIMARY KEY,
  id_usuario UUID NOT NULL,
  tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('medico', 'paciente')),
  telefono VARCHAR(20) NOT NULL,
  codigo VARCHAR(10) NOT NULL,
  expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  intentos INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_tokens_token ON sms_confirmacion_tokens (codigo, tipo_usuario);
CREATE INDEX IF NOT EXISTS idx_sms_tokens_usuario ON sms_confirmacion_tokens (id_usuario, tipo_usuario);

-- Tabla de logs de SMS enviados
CREATE TABLE IF NOT EXISTS sms_log (
  id SERIAL PRIMARY KEY,
  telefono VARCHAR(20) NOT NULL,
  mensaje TEXT,
  proveedor VARCHAR(50),
  estado VARCHAR(20) DEFAULT 'enviado',
  error_mensaje TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
