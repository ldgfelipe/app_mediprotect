import { useDbPool } from './db'

const MIGRATIONS_SQL = `
-- 1. Tablas base
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  telefono VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL DEFAULT '$2b$10$dummyhashfordevelopmentonly',
  fecha_nacimiento DATE,
  genero VARCHAR(20),
  direccion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  slug VARCHAR(200) UNIQUE,
  especialidad VARCHAR(100),
  precio_regular DECIMAL(10,2) DEFAULT 0,
  porcentaje_descuento DECIMAL(5,2) DEFAULT 10,
  monto_comision DECIMAL(10,2) DEFAULT 0,
  porcentaje_comision DECIMAL(5,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  estatus_medico VARCHAR(50) DEFAULT 'activo',
  telefono VARCHAR(20),
  whatsapp_telefono TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(20) UNIQUE NOT NULL,
  id_paciente UUID REFERENCES pacientes(id),
  id_medico UUID REFERENCES medicos(id),
  fecha_hora TIMESTAMPTZ,
  precio_acordado DECIMAL(10,2) DEFAULT 0,
  notas_paciente TEXT,
  estado VARCHAR(50) DEFAULT 'pendiente',
  whatsapp_telefono TEXT,
  whatsapp_nombre TEXT,
  whatsapp_medico_nombre TEXT,
  whatsapp_opciones JSONB DEFAULT '[]',
  recordatorio_enviado BOOLEAN DEFAULT false,
  respuesta_paciente_asistio VARCHAR(10),
  respuesta_paciente_at TIMESTAMPTZ,
  respuesta_medico_asistio VARCHAR(10),
  respuesta_medico_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  definicion JSONB NOT NULL DEFAULT '{}',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flows_activo ON whatsapp_flows(activo);

CREATE TABLE IF NOT EXISTS configuracion_sistema (
  clave VARCHAR(100) PRIMARY KEY,
  valor TEXT,
  categoria VARCHAR(50),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas(id_paciente);
CREATE INDEX IF NOT EXISTS idx_citas_medico ON citas(id_medico);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_hora);

CREATE TABLE IF NOT EXISTS calificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cita_id UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('paciente', 'medico')),
  calificacion SMALLINT NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cita_id, tipo)
);

CREATE TABLE IF NOT EXISTS comisiones_medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cita_id UUID NOT NULL UNIQUE REFERENCES citas(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  monto DECIMAL(10,2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'cancelada')),
  pagada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE medicos 
ADD COLUMN IF NOT EXISTS calificacion_promedio NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_calificaciones INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_comisiones DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS whatsapp_telefono TEXT;

ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS calificacion_promedio NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_calificaciones INTEGER DEFAULT 0;

ALTER TABLE citas 
ADD COLUMN IF NOT EXISTS whatsapp_opciones JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS recordatorio_enviado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_telefono TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_nombre TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_medico_nombre TEXT,
ADD COLUMN IF NOT EXISTS respuesta_paciente_asistio VARCHAR(10),
ADD COLUMN IF NOT EXISTS respuesta_paciente_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS respuesta_medico_asistio VARCHAR(10),
ADD COLUMN IF NOT EXISTS respuesta_medico_at TIMESTAMPTZ;

ALTER TABLE medicos 
ADD COLUMN IF NOT EXISTS whatsapp_telefono TEXT;

-- 2. Clicks en tarjetas de médico y botón de WhatsApp del perfil
CREATE TABLE IF NOT EXISTS medico_clicks (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  origen VARCHAR(50),
  id_medico UUID,
  medico_nombre VARCHAR(200),
  especialidad VARCHAR(150),
  ubicacion VARCHAR(200),
  pagina TEXT,
  referrer TEXT,
  sesion_id VARCHAR(64),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medico_clicks_tipo ON medico_clicks(tipo);
CREATE INDEX IF NOT EXISTS idx_medico_clicks_medico ON medico_clicks(id_medico);
CREATE INDEX IF NOT EXISTS idx_medico_clicks_created ON medico_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medico_clicks_sesion ON medico_clicks(sesion_id);

-- Datos iniciales
INSERT INTO medicos (nombre, apellido, slug, especialidad, precio_regular, porcentaje_descuento, activo, estatus_medico)
VALUES ('Raul', 'Payan Nadue', 'raul-payan-nadue', 'Medicina General', 1000, 10, true, 'activo')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO pacientes (id, nombre, apellido, email, telefono, password_hash, activo)
VALUES ('ff142735-ee46-4e7d-8ed8-2e529a16d9f7', 'Ana', 'Martinez Diaz', 'ana.test@mediprotect.com.mx', '2224445566', '\$2b\$10\$dummyhashfordevelopmentonly', true)
ON CONFLICT (id) DO NOTHING;

UPDATE whatsapp_flows SET activo = false WHERE nombre = 'citas';

INSERT INTO whatsapp_flows (nombre, keywords, descripcion, definicion, activo)
VALUES (
  'solicitud_estructurada',
  ARRAY['solicitud_estructurada','cita_con_datos','paciente_id_doctor'],
  'Procesa solicitud con ID paciente, nombre médico, email, teléfono desde URL',
  '{"nodes":[{"id":"n_inicio","type":"inicio","config":{},"position":{"x":20,"y":120}},{"id":"n_buscar_paciente","type":"accion","config":{"accion":"buscar_paciente_por_id","texto":""},"position":{"x":220,"y":40}},{"id":"n_buscar_doctor","type":"accion","config":{"accion":"buscar_doctor_por_nombre","texto":""},"position":{"x":460,"y":40}},{"id":"n_crear_cita_pendiente","type":"accion","config":{"accion":"crear_cita_pendiente","texto":""},"position":{"x":700,"y":40}},{"id":"n_notificar_doctor","type":"accion","config":{"accion":"notificar_doctor_whatsapp","texto":""},"position":{"x":940,"y":-60}},{"id":"n_enviar_opciones","type":"accion","config":{"accion":"enviar_opciones_fecha_hora","texto":""},"position":{"x":940,"y":140}},{"id":"n_fin","type":"fin","config":{"texto":"✅ *Solicitud registrada*\\n\\nHemos registrado tu solicitud de cita con *{{doctor_nombre}}*.\\n\\n📋 *Datos:*\\n• Paciente: {{paciente_nombre}}\\n• Médico: {{doctor_nombre}}\\n• Estado: *Fecha por confirmar*\\n\\nUn asistente te contactará para coordinar fecha y hora.\\n\\n¿Hay algo más en lo que te pueda ayudar?"},"position":{"x":1180,"y":40}}],"edges":[{"id":"e1","source":"n_inicio","target":"n_buscar_paciente"},{"id":"e2","source":"n_buscar_paciente","target":"n_buscar_doctor"},{"id":"e3","source":"n_buscar_doctor","target":"n_crear_cita_pendiente"},{"id":"e4","source":"n_crear_cita_pendiente","target":"n_notificar_doctor"},{"id":"e5","source":"n_crear_cita_pendiente","target":"n_enviar_opciones"},{"id":"e6","source":"n_notificar_doctor","target":"n_fin"},{"id":"e7","source":"n_enviar_opciones","target":"n_fin"}]}'::jsonb,
  true
)
ON CONFLICT (nombre) DO UPDATE SET
  keywords = EXCLUDED.keywords,
  descripcion = EXCLUDED.descripcion,
  definicion = EXCLUDED.definicion,
  activo = EXCLUDED.activo,
  updated_at = NOW();
`

export async function initializeDatabase() {
  const pool = await useDbPool()
  
  try {
    console.log('[DB-INIT] Iniciando verificación/creación de esquema de BD...')
    
    // Ejecutar migraciones
    await pool.query(MIGRATIONS_SQL)
    
    console.log('[DB-INIT] Esquema de BD verificado/creado correctamente')
    
    // Refresh PostgREST cache
    try {
      await pool.query("NOTIFY pgrst, 'reload schema';")
      console.log('[DB-INIT] PostgREST cache refreshed')
    } catch (e) {
      console.log('[DB-INIT] No se pudo refrescar PostgREST (puede ser normal en local):', e.message)
    }
    
    return { success: true }
  } catch (error) {
    console.error('[DB-INIT] Error inicializando BD:', error)
    throw error
  }
}

// Auto-ejecutar si se importa directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}