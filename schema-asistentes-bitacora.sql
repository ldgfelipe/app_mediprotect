-- ============================================
-- MEDI PROTECT - Schema: Asistentes, Bitácora y Estados de Cita
-- ============================================

-- 1. Tabla de asistentes (perfiles de asistentes que atienden WhatsApp)
CREATE TABLE IF NOT EXISTS asistentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefono VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  activo BOOLEAN DEFAULT true,
  permisos JSONB DEFAULT '{"citas": true, "pacientes": true, "medicos": false, "usuarios": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bitácora de cambios en citas (log completo)
CREATE TABLE IF NOT EXISTS citas_bitacora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  id_usuario UUID, -- quién hizo el cambio (puede ser paciente, doctor, asistente o admin)
  tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('paciente', 'medico', 'asistente', 'admin', 'sistema')),
  accion VARCHAR(50) NOT NULL, -- 'creacion', 'confirmacion', 'llegada_paciente', 'inicio_atencion', 'fin_atencion', 'cancelacion', 'nota', 'cambio_estado'
  estado_anterior VARCHAR(30), -- estado antes del cambio
  estado_nuevo VARCHAR(30), -- estado después del cambio
  descripcion TEXT, -- descripción libre del cambio
  datos_adicionales JSONB, -- info extra (notas, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Agregar nuevos estados a la tabla citas
-- Estados posibles: pendiente, confirmada, paciente_llego, en_atencion, asistida, no_asistida, cancelada, reagendada
-- (la columna 'estado' ya existe en citas, solo necesitamos los nuevos valores)

-- 4. Agregar campos de tracking a citas
ALTER TABLE citas ADD COLUMN IF NOT EXISTS paciente_llego_at TIMESTAMPTZ;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS inicio_atencion_at TIMESTAMPTZ;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS fin_atencion_at TIMESTAMPTZ;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS asistente_id UUID REFERENCES asistentes(id);
ALTER TABLE citas ADD COLUMN IF NOT EXISTS notas_asistente TEXT;

-- 5. Tabla de mensajes de WhatsApp (log de comunicación)
CREATE TABLE IF NOT EXISTS whatsapp_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita UUID REFERENCES citas(id) ON DELETE SET NULL,
  id_asistente UUID REFERENCES asistentes(id) ON DELETE SET NULL,
  direccion VARCHAR(10) NOT NULL CHECK (direccion IN ('saliente', 'entrante')),
  remitente VARCHAR(100), -- nombre de quien envía
  destinatario VARCHAR(100), -- nombre de recibe
  telefono VARCHAR(20),
  mensaje TEXT NOT NULL,
  registrado_por UUID, -- asistente que registró el mensaje
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_citas_bitacora_cita ON citas_bitacora(id_cita);
CREATE INDEX IF NOT EXISTS idx_citas_bitacora_fecha ON citas_bitacora(created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_cita ON whatsapp_mensajes(id_cita);
CREATE INDEX IF NOT EXISTS idx_asistentes_email ON asistentes(email);

-- 7. Función para registrar cambios automáticamente
CREATE OR REPLACE FUNCTION registrar_cambio_cita()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO citas_bitacora (id_cita, tipo_usuario, accion, estado_anterior, estado_nuevo, created_at)
    VALUES (NEW.id, 'sistema', 'cambio_estado', OLD.estado, NEW.estado, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para cambios automáticos de estado
DROP TRIGGER IF EXISTS trigger_estado_cita ON citas;
CREATE TRIGGER trigger_estado_cita
  AFTER UPDATE OF estado ON citas
  FOR EACH ROW
  EXECUTE FUNCTION registrar_cambio_cita();
