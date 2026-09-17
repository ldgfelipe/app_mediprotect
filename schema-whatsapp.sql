-- ============================================
-- MIGRACIONES WHATSAPP - MediProtect
-- ============================================

-- 1. Columnas nuevas en medicos
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS telefono_recepcion VARCHAR(20);
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS porcentaje_descuento NUMERIC DEFAULT 10;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS monto_comision NUMERIC DEFAULT 100;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS estatus_medico VARCHAR(20) DEFAULT 'activo'
  CHECK (estatus_medico IN ('activo', 'en_revision', 'suspendido_pago'));
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS dias_disponibles INTEGER[] DEFAULT '{1,2,3,4,5}';
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS horario_inicio TIME DEFAULT '09:00';
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS horario_fin TIME DEFAULT '14:00';
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS horario_inicio_vespertino TIME DEFAULT '16:00';
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS horario_fin_vespertino TIME DEFAULT '20:00';

-- 2. Columnas nuevas en citas
ALTER TABLE citas ADD COLUMN IF NOT EXISTS folio VARCHAR(20) UNIQUE;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS precio_acordado NUMERIC;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS respuesta_doctor VARCHAR(20);
ALTER TABLE citas ADD COLUMN IF NOT EXISTS respuesta_paciente VARCHAR(20);
ALTER TABLE citas ADD COLUMN IF NOT EXISTS calificacion_paciente INTEGER;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS auditoria_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS respuesta_paciente_at TIMESTAMPTZ;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS respuesta_doctor_at TIMESTAMPTZ;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS recordatorio_24h_enviado BOOLEAN DEFAULT FALSE;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS encuesta_enviada BOOLEAN DEFAULT FALSE;

-- 3. Generador de folios
CREATE SEQUENCE IF NOT EXISTS folio_cita_seq START 1000;

-- Función para generar folio MP-XXXX
CREATE OR REPLACE FUNCTION generar_folio_cita() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio IS NULL THEN
    NEW.folio := 'MP-' || LPAD(nextval('folio_cita_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_folio_cita ON citas;
CREATE TRIGGER trg_folio_cita BEFORE INSERT ON citas
  FOR EACH ROW EXECUTE FUNCTION generar_folio_cita();

-- 4. Tabla estados_cuenta_medicos
CREATE TABLE IF NOT EXISTS estados_cuenta_medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_medico UUID REFERENCES medicos(id),
  periodo VARCHAR(20) NOT NULL,
  citas_completadas INTEGER DEFAULT 0,
  total_comisiones NUMERIC DEFAULT 0,
  estatus_pago VARCHAR(20) DEFAULT 'pendiente'
    CHECK (estatus_pago IN ('pendiente', 'pagado', 'vencido')),
  enlace_pago TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id_medico, periodo)
);

-- 5. Tabla whatsapp_conversaciones
CREATE TABLE IF NOT EXISTS whatsapp_conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefono VARCHAR(20) UNIQUE NOT NULL,
  nombre_paciente VARCHAR(100),
  id_paciente UUID REFERENCES pacientes(id),
  estado VARCHAR(50) DEFAULT 'bienvenida',
  datos_temp JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_telefono ON whatsapp_conversaciones(telefono);

-- 6. Tabla whatsapp_mensajes_log
CREATE TABLE IF NOT EXISTS whatsapp_mensajes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefono VARCHAR(20) NOT NULL,
  direccion VARCHAR(5) NOT NULL CHECK (direccion IN ('in', 'out')),
  mensaje TEXT,
  tipo VARCHAR(20) DEFAULT 'text',
  whatsapp_msg_id VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_log_telefono ON whatsapp_mensajes_log(telefono);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_fecha ON whatsapp_mensajes_log(created_at);

-- 7. Tabla whatsapp_rate_limit
CREATE TABLE IF NOT EXISTS whatsapp_rate_limit (
  telefono VARCHAR(20) PRIMARY KEY,
  intentos INTEGER DEFAULT 1,
  ventana_inicio TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Configuración WhatsApp en configuracion_sistema
INSERT INTO configuracion_sistema (clave, valor, descripcion, categoria, tipo) VALUES
  ('whatsapp_verify_token', 'mediprotect_wa_verify_2026', 'Token de verificación del webhook WhatsApp', 'whatsapp', 'text'),
  ('whatsapp_token', '', 'Token de acceso Meta Cloud API', 'whatsapp', 'password'),
  ('whatsapp_phone_number_id', '', 'ID del número WhatsApp Business (Producción)', 'whatsapp', 'text'),
  ('whatsapp_app_secret', '', 'Secret de la app Meta para firma HMAC', 'whatsapp', 'password'),
  ('whatsapp_webhook_activo', 'true', 'Activar/desactivar webhook WhatsApp', 'whatsapp', 'toggle'),
  ('whatsapp_modo', 'sandbox', 'Modo: sandbox (pruebas) o produccion', 'whatsapp', 'select'),
  ('whatsapp_token_sandbox', '', 'Token de acceso Meta - Sandbox', 'whatsapp', 'password'),
  ('whatsapp_phone_number_id_sandbox', '', 'ID del número WhatsApp Business - Sandbox', 'whatsapp', 'text')
ON CONFLICT (clave) DO NOTHING;

-- 9. Tabla de recordatorios enviados (para evitar duplicados)
CREATE TABLE IF NOT EXISTS whatsapp_recordatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita UUID REFERENCES citas(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('24h', 'encuesta_paciente', 'encuesta_doctor', 'recordatorio_12h')),
  enviado_a VARCHAR(20) NOT NULL CHECK (enviado_a IN ('paciente', 'doctor', 'recepcion')),
  whatsapp_msg_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id_cita, tipo, enviado_a)
);
