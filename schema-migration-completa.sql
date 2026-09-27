-- ============================================================
-- MIGRACION COMPLETA - Agregar tablas y columnas faltantes
-- Ejecutar en PRODUCCION y TEST
-- Fecha: 2026-09-10
-- ============================================================

-- ============================================
-- 1. TABLA: telefonos_verificados (faltante en todos los schemas)
-- ============================================
CREATE TABLE IF NOT EXISTS telefonos_verificados (
  id SERIAL PRIMARY KEY,
  telefono VARCHAR(20) NOT NULL,
  descripcion TEXT,
  verificado_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telefonos_verificados_telefono ON telefonos_verificados(telefono);

-- ============================================
-- 2. TABLA: consultorios (multi-ubicacion por medico)
-- ============================================
CREATE TABLE IF NOT EXISTS consultorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_medico UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  direccion TEXT,
  codigo_postal VARCHAR(10),
  colonia VARCHAR(150),
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  hospital_consultorio VARCHAR(200),
  google_maps_url TEXT,
  es_principal BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consultorios_medico ON consultorios(id_medico);

-- ============================================
-- 3. COLUMNA: comision_tipo en medicos
-- ============================================
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS comision_tipo INTEGER DEFAULT 1;

-- ============================================
-- 4. COLUMNA: google_maps_url en empresas
-- ============================================
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- ============================================
-- 5. COLUMNA: error_mensaje en pagos (para webhook/procesar)
-- ============================================
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS error_mensaje TEXT;

-- ============================================
-- 6. ROLES y USUARIOS_SISTEMA (si no existen)
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) UNIQUE NOT NULL
);
INSERT INTO roles (nombre) VALUES ('Administrador'), ('Editor'), ('Visualizador') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(200) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  id_rol INTEGER REFERENCES roles(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Admin por defecto: admin@mediprotect.com.mx / admin123
INSERT INTO usuarios_sistema (id, nombre, email, password_hash, id_rol, activo)
SELECT gen_random_uuid(), 'Administrador', 'admin@mediprotect.com.mx',
       '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
       (SELECT id FROM roles WHERE nombre = 'Administrador'), true
WHERE NOT EXISTS (SELECT 1 FROM usuarios_sistema WHERE email = 'admin@mediprotect.com.mx');

-- ============================================
-- 7. API_TOKENS (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(200) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  token_preview VARCHAR(20),
  user_id UUID,
  user_tipo VARCHAR(50),
  permisos JSONB DEFAULT '{}',
  activo BOOLEAN DEFAULT true,
  ultimo_uso TIMESTAMPTZ,
  creado_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. PRE_REGISTROS (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS pre_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curp VARCHAR(18),
  nombre VARCHAR(200),
  apellido_paterno VARCHAR(100),
  apellido_materno VARCHAR(100),
  fecha_nacimiento DATE,
  genero VARCHAR(20),
  email VARCHAR(255),
  telefono VARCHAR(20),
  password VARCHAR(255),
  codigo_postal VARCHAR(10),
  colonia VARCHAR(150),
  municipio VARCHAR(100),
  estado VARCHAR(100),
  ciudad VARCHAR(100),
  direccion TEXT,
  doctor_nombre VARCHAR(200),
  estado_registro VARCHAR(50) DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. ASISTENTES (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS asistentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(200) NOT NULL,
  apellido VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  telefono VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  activo BOOLEAN DEFAULT true,
  permisos JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. CITAS_BITACORA (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS citas_bitacora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  id_usuario UUID,
  tipo_usuario VARCHAR(50),
  accion VARCHAR(100) NOT NULL,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50),
  descripcion TEXT,
  datos_adicionales JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bitacora_cita ON citas_bitacora(id_cita);

-- ============================================
-- 11. WHATSAPP_MENSAJES (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita UUID REFERENCES citas(id) ON DELETE SET NULL,
  id_asistente UUID REFERENCES asistentes(id),
  direccion VARCHAR(20),
  remitente VARCHAR(200),
  destinatario VARCHAR(200),
  telefono VARCHAR(20),
  mensaje TEXT,
  registrado_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_mensajes_cita ON whatsapp_mensajes(id_cita);

-- ============================================
-- 12. COLUMNAS faltantes en citas (para bitacora)
-- ============================================
ALTER TABLE citas ADD COLUMN IF NOT EXISTS paciente_llego_at TIMESTAMPTZ;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS inicio_atencion_at TIMESTAMPTZ;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS fin_atencion_at TIMESTAMPTZ;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS asistente_id UUID REFERENCES asistentes(id);
ALTER TABLE citas ADD COLUMN IF NOT EXISTS notas_asistente TEXT;
ALTER TABLE citas ALTER COLUMN id_paciente DROP NOT NULL;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS whatsapp_telefono VARCHAR(30);
ALTER TABLE citas ADD COLUMN IF NOT EXISTS whatsapp_nombre VARCHAR(200);
ALTER TABLE citas ADD COLUMN IF NOT EXISTS whatsapp_medico_nombre VARCHAR(200);
ALTER TABLE citas ADD COLUMN IF NOT EXISTS whatsapp_opciones JSONB;
CREATE INDEX IF NOT EXISTS idx_citas_pendientes_whatsapp
  ON citas (estado, created_at)
  WHERE estado = 'PENDIENTE_DE_COORDINACION' AND fecha_hora IS NULL;

-- ============================================
-- 13. TRIGGER para bitacora automatica en cambios de estado
-- ============================================
CREATE OR REPLACE FUNCTION trigger_estado_cita() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO citas_bitacora (id_cita, id_usuario, tipo_usuario, accion, estado_anterior, estado_nuevo, created_at)
    VALUES (NEW.id, NEW.asistente_id, 'sistema', 'cambio_estado', OLD.estado, NEW.estado, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_estado_cita ON citas;
CREATE TRIGGER trigger_estado_cita
  AFTER UPDATE OF estado ON citas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_estado_cita();
