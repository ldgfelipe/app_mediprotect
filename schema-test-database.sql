-- ============================================================
-- MEDI PROTECT - Schema completo para BASE DE PRUEBAS
-- Copia de estructura de producción (sin datos)
-- Fecha: 2026-09-10
-- ============================================================

-- ============================================
-- 1. ESPECIALIDADES
-- ============================================
CREATE TABLE IF NOT EXISTS especialidades (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(200) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE,
  icono VARCHAR(100) DEFAULT 'fa-solid fa-stethoscope',
  color VARCHAR(50),
  descripcion TEXT
);

INSERT INTO especialidades (nombre, slug, icono) VALUES
  ('Medicina General', 'medicina-general', 'fa-solid fa-stethoscope'),
  ('Pediatría', 'pediatria', 'fa-solid fa-children'),
  ('Ginecología', 'ginecologia', 'fa-solid fa-venus'),
  ('Cardiología', 'cardiologia', 'fa-solid fa-heart-pulse'),
  ('Dermatología', 'dermatologia', 'fa-solid fa-hand-dots'),
  ('Ortopedia', 'ortopedia', 'fa-solid fa-bone'),
  ('Oftalmología', 'oftalmologia', 'fa-solid fa-eye'),
  ('Psicología', 'psicologia', 'fa-solid fa-brain'),
  ('Nutrición', 'nutricion', 'fa-solid fa-apple-whole'),
  ('Odontología', 'odontologia', 'fa-solid fa-tooth'),
  ('Medicina Interna', 'medicina-interna', 'fa-solid fa-user-doctor'),
  ('Neurología', 'neurologia', 'fa-solid fa-brain'),
  ('Urología', 'urologia', 'fa-solid fa-person'),
  ('Traumatología', 'traumatologia', 'fa-solid fa-bone'),
  ('Neumología', 'neumologia', 'fa-solid fa-lungs'),
  ('Alergia e Inmunología', 'alergia-e-inmunologia', 'fa-solid fa-allergies'),
  ('Acupuntura', 'acupuntura', 'fa-solid fa-needle'),
  ('Bariatría', 'bariatria', 'fa-solid fa-weight-hanging'),
  ('Cirugía General', 'cirugia-general', 'fa-solid fa-user-md'),
  ('Cirugía Plástica', 'cirugia-plastica', 'fa-solid fa-syringe'),
  ('Coaching', 'coaching', 'fa-solid fa-comments'),
  ('Cirugía Pediátrica', 'cirugia-pediatrica', 'fa-solid fa-baby'),
  ('Curación de Heridas', 'curacion-de-heridas', 'fa-solid fa-bandage'),
  ('Ecografía / Ultrasonido', 'ecografia-ultrasonido', 'fa-solid fa-wave-square'),
  ('Enfermería Obstétrica', 'enfermeria-obstetrica', 'fa-solid fa-user-nurse'),
  ('Fisioterapia', 'fisioterapia', 'fa-solid fa-person-walking'),
  ('Geriatría', 'geriatria', 'fa-solid fa-person-cane'),
  ('Medicina Estética', 'medicina-estetica', 'fa-solid fa-spa'),
  ('Medicina Familiar', 'medicina-familiar', 'fa-solid fa-house-medical'),
  ('Medicina Preventiva', 'medicina-preventiva', 'fa-solid fa-shield-virus'),
  ('Medicina de Rehabilitación', 'medicina-rehabilitacion', 'fa-solid fa-universal-access'),
  ('Medicina del Trabajo', 'medicina-del-trabajo', 'fa-solid fa-hard-hat'),
  ('Nefrología', 'nefrologia', 'fa-solid fa-droplet'),
  ('Neuropsicología', 'neuropsicologia', 'fa-solid fa-brain'),
  ('Oncología', 'oncologia', 'fa-solid fa-ribbon'),
  ('Psiquiatría', 'psiquiatria', 'fa-solid fa-pills'),
  ('Reumatología', 'reumatologia', 'fa-solid fa-bone'),
  ('Salud Auditiva', 'salud-auditiva', 'fa-solid fa-ear-listen')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================
-- 2. CENTROS MÉDICOS
-- ============================================
CREATE TABLE IF NOT EXISTS centros_medicos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  direccion TEXT,
  ciudad TEXT DEFAULT 'Puebla',
  estado TEXT DEFAULT 'Puebla',
  telefono TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. PACIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  apellido VARCHAR(100),
  apellido_paterno VARCHAR(100),
  apellido_materno VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  telefono2 VARCHAR(20),
  telefono_confirmado BOOLEAN DEFAULT false,
  email_confirmado BOOLEAN DEFAULT false,
  fecha_nacimiento DATE,
  genero VARCHAR(20),
  direccion TEXT,
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  municipio VARCHAR(100),
  codigo_postal VARCHAR(10),
  colonia VARCHAR(150),
  curp VARCHAR(18),
  estado_civil VARCHAR(20),
  ocupacion VARCHAR(100),
  como_nos_conociste VARCHAR(50),
  acepta_terminos BOOLEAN DEFAULT false,
  acepta_marketing BOOLEAN DEFAULT false,
  acepta_seguro BOOLEAN DEFAULT false,
  plan_contratado VARCHAR(20),
  identificacion_tipo VARCHAR(20),
  identificacion_numero VARCHAR(30),
  beneficiario_nombre VARCHAR(150),
  beneficiario_parentesco VARCHAR(50),
  beneficiario_telefono VARCHAR(20),
  hospital_consultorio VARCHAR(200),
  estudios JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pacientes_email ON pacientes(email);
CREATE INDEX IF NOT EXISTS idx_pacientes_colonia ON pacientes(colonia);

-- ============================================
-- 4. MÉDICOS
-- ============================================
CREATE TABLE IF NOT EXISTS medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  apellido_paterno VARCHAR(100),
  apellido_materno VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  telefono VARCHAR(20),
  telefono_confirmado BOOLEAN DEFAULT false,
  email_confirmado BOOLEAN DEFAULT false,
  cedula_profesional VARCHAR(50),
  cedula_especialidad TEXT,
  id_especialidad BIGINT REFERENCES especialidades(id),
  consultorio_direccion TEXT,
  consultorio_ciudad VARCHAR(100),
  consultorio_estado VARCHAR(100),
  bio TEXT,
  slug VARCHAR(255) UNIQUE,
  titulo VARCHAR(20) DEFAULT 'Dr.',
  subespecialidad TEXT,
  universidad TEXT,
  frase_inspiradora TEXT,
  whatsapp VARCHAR(20) DEFAULT '522228021933',
  precio_regular DECIMAL(10,2),
  precio_miembro DECIMAL(10,2),
  destacado BOOLEAN DEFAULT false,
  score_confianza NUMERIC DEFAULT 0,
  centro_id BIGINT REFERENCES centros_medicos(id),
  foto_url TEXT,
  rfc VARCHAR(13),
  curp VARCHAR(18),
  codigo_postal VARCHAR(10),
  colonia VARCHAR(200),
  hospital_consultorio VARCHAR(200),
  tipo_consulta VARCHAR(30) DEFAULT 'presencial',
  usuario VARCHAR(100) UNIQUE,
  activo BOOLEAN DEFAULT true,
  horario_atencion TEXT,
  servicios JSONB,
  idiomas JSONB,
  formacion_academica JSONB,
  informacion_consulta JSONB,
  perfil_url TEXT,
  perfil_url_path TEXT,
  especialidad VARCHAR,
  ciudad VARCHAR,
  estudios JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medicos_slug ON medicos(slug);
CREATE INDEX IF NOT EXISTS idx_medicos_activo ON medicos(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_medicos_curp ON medicos(curp);

-- ============================================
-- 5. CITAS
-- ============================================
CREATE TABLE IF NOT EXISTS citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_paciente UUID REFERENCES pacientes(id),
  id_medico UUID REFERENCES medicos(id),
  fecha_hora TIMESTAMPTZ,
  estado VARCHAR(30) DEFAULT 'pendiente',
  whatsapp_telefono VARCHAR(30),
  whatsapp_nombre VARCHAR(200),
  whatsapp_medico_nombre VARCHAR(200),
  whatsapp_opciones JSONB,
  notas_paciente TEXT,
  notas_medico TEXT,
  notas_asistente TEXT,
  costo_consulta DECIMAL(10,2),
  resultado_triangulacion VARCHAR(50),
  paciente_llego_at TIMESTAMPTZ,
  inicio_atencion_at TIMESTAMPTZ,
  fin_atencion_at TIMESTAMPTZ,
  asistente_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas(id_paciente);
CREATE INDEX IF NOT EXISTS idx_citas_medico ON citas(id_medico);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);

-- ============================================
-- 6. ASISTENTES
-- ============================================
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

-- ============================================
-- 7. BITÁCORA DE CITAS
-- ============================================
CREATE TABLE IF NOT EXISTS citas_bitacora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  id_usuario UUID,
  tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('paciente', 'medico', 'asistente', 'admin', 'sistema')),
  accion VARCHAR(50) NOT NULL,
  estado_anterior VARCHAR(30),
  estado_nuevo VARCHAR(30),
  descripcion TEXT,
  datos_adicionales JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citas_bitacora_cita ON citas_bitacora(id_cita);
CREATE INDEX IF NOT EXISTS idx_citas_bitacora_fecha ON citas_bitacora(created_at);

-- FK de asistente_id en citas (después de crear asistentes)
ALTER TABLE citas ADD CONSTRAINT fk_citas_asistente
  FOREIGN KEY (asistente_id) REFERENCES asistentes(id) ON DELETE SET NULL;

-- ============================================
-- 8. MENSAJES WHATSAPP
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_mensajes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita UUID REFERENCES citas(id) ON DELETE SET NULL,
  id_asistente UUID REFERENCES asistentes(id) ON DELETE SET NULL,
  direccion VARCHAR(10) NOT NULL CHECK (direccion IN ('saliente', 'entrante')),
  remitente VARCHAR(100),
  destinatario VARCHAR(100),
  telefono VARCHAR(20),
  mensaje TEXT NOT NULL,
  registrado_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_cita ON whatsapp_mensajes(id_cita);
CREATE INDEX IF NOT EXISTS idx_asistentes_email ON asistentes(email);

-- ============================================
-- 9. TRIGGER BITÁCORA AUTOMÁTICA
-- ============================================
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

DROP TRIGGER IF EXISTS trigger_estado_cita ON citas;
CREATE TRIGGER trigger_estado_cita
  AFTER UPDATE OF estado ON citas
  FOR EACH ROW
  EXECUTE FUNCTION registrar_cambio_cita();

-- ============================================
-- 10. CONFIGURACIÓN DEL SISTEMA
-- ============================================
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(255) UNIQUE NOT NULL,
  valor TEXT,
  valor_encriptado TEXT,
  descripcion TEXT,
  categoria VARCHAR(100),
  tipo VARCHAR(50) DEFAULT 'text',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. PAQUETES / PLANES
-- ============================================
CREATE TABLE IF NOT EXISTS paquetes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  slug VARCHAR(100),
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  duracion_dias INTEGER DEFAULT 30,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paquete_beneficios (
  id SERIAL PRIMARY KEY,
  id_paquete INTEGER NOT NULL REFERENCES paquetes(id) ON DELETE CASCADE,
  beneficio TEXT NOT NULL,
  valor TEXT,
  tipo VARCHAR(50),
  orden INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paquete_beneficios_paquete ON paquete_beneficios(id_paquete);

-- ============================================
-- 12. PACIENTE_PAQUETE
-- ============================================
CREATE TABLE IF NOT EXISTS paciente_paquete (
  id SERIAL PRIMARY KEY,
  id_paciente UUID NOT NULL REFERENCES pacientes(id),
  id_paquete INTEGER NOT NULL REFERENCES paquetes(id),
  fecha_inicio TIMESTAMP DEFAULT NOW(),
  fecha_fin TIMESTAMP,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paciente_paquete_paciente ON paciente_paquete(id_paciente);

-- ============================================
-- 13. EMPRESAS
-- ============================================
CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  rfc VARCHAR(20),
  email VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  contacto_nombre VARCHAR(200),
  direccion TEXT,
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  email_confirmado BOOLEAN DEFAULT false,
  telefono_confirmado BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 14. EMPRESA_PACIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS empresa_pacientes (
  id SERIAL PRIMARY KEY,
  id_empresa INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  id_paciente UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  fecha_asignacion TIMESTAMP DEFAULT NOW(),
  activo BOOLEAN DEFAULT true,
  UNIQUE(id_empresa, id_paciente)
);

CREATE INDEX IF NOT EXISTS idx_empresa_pacientes_empresa ON empresa_pacientes(id_empresa);
CREATE INDEX IF NOT EXISTS idx_empresa_pacientes_paciente ON empresa_pacientes(id_paciente);

-- ============================================
-- 15. PAGOS
-- ============================================
CREATE TABLE IF NOT EXISTS pagos (
  id SERIAL PRIMARY KEY,
  id_paciente UUID REFERENCES pacientes(id),
  id_plan INTEGER REFERENCES paquetes(id),
  id_paquete INTEGER REFERENCES paquetes(id),
  monto DECIMAL(10,2) NOT NULL,
  moneda VARCHAR(10) DEFAULT 'MXN',
  provedor VARCHAR(50),
  provedor_pago_id VARCHAR(200),
  metodo_pago VARCHAR(50),
  referencia VARCHAR(200),
  estado VARCHAR(30) DEFAULT 'pendiente',
  estatus VARCHAR(30) DEFAULT 'pendiente' CHECK (estatus IN ('pendiente', 'completado', 'fallido', 'reembolsado')),
  sandbox BOOLEAN,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_paciente ON pagos(id_paciente);
CREATE INDEX IF NOT EXISTS idx_pagos_estatus ON pagos(estatus);

-- ============================================
-- 16. CONFIRMACIÓN EMAIL
-- ============================================
CREATE TABLE IF NOT EXISTS email_confirmacion_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL,
  tipo_usuario VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expira_en TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_confirmacion_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_usuario ON email_confirmacion_tokens(id_usuario, tipo_usuario);

-- ============================================
-- 17. CONFIRMACIÓN SMS
-- ============================================
CREATE TABLE IF NOT EXISTS sms_confirmacion_tokens (
  id SERIAL PRIMARY KEY,
  id_usuario UUID NOT NULL,
  tipo_usuario VARCHAR(20) NOT NULL CHECK (tipo_usuario IN ('medico', 'paciente')),
  telefono VARCHAR(20) NOT NULL,
  codigo VARCHAR(10) NOT NULL,
  expira_en TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  intentos INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_tokens_token ON sms_confirmacion_tokens (codigo, tipo_usuario);
CREATE INDEX IF NOT EXISTS idx_sms_tokens_usuario ON sms_confirmacion_tokens (id_usuario, tipo_usuario);

CREATE TABLE IF NOT EXISTS sms_log (
  id SERIAL PRIMARY KEY,
  telefono VARCHAR(20) NOT NULL,
  mensaje TEXT,
  proveedor VARCHAR(50),
  estado VARCHAR(20) DEFAULT 'enviado',
  error_mensaje TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 18. CONEXIONES SMS
-- ============================================
CREATE TABLE IF NOT EXISTS sms_conexiones (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  proveedor VARCHAR(50) NOT NULL DEFAULT 'twilio',
  account_sid VARCHAR(200) DEFAULT '',
  auth_token VARCHAR(200) DEFAULT '',
  api_url VARCHAR(500) DEFAULT '',
  metodo VARCHAR(10) DEFAULT 'POST',
  from_number VARCHAR(30) DEFAULT '',
  modo VARCHAR(20) DEFAULT 'sandbox' CHECK (modo IN ('sandbox', 'produccion')),
  activa BOOLEAN DEFAULT true,
  preferida BOOLEAN DEFAULT false,
  prioridad INT DEFAULT 0,
  descripcion TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 19. API TOKENS
-- ============================================
CREATE TABLE IF NOT EXISTS api_tokens (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  token_preview VARCHAR(20) NOT NULL,
  user_id UUID NOT NULL,
  user_tipo VARCHAR(20) NOT NULL DEFAULT 'paciente',
  permisos JSONB DEFAULT '[]'::jsonb,
  activo BOOLEAN DEFAULT true,
  ultimo_uso TIMESTAMPTZ,
  creado_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_api_tokens_activo ON api_tokens (activo);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens (user_id, user_tipo);

-- ============================================
-- 20. BENEFICIARIOS
-- ============================================
CREATE TABLE IF NOT EXISTS beneficiarios_paciente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_paciente UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  nombre VARCHAR(150) NOT NULL,
  apellido_paterno VARCHAR(100),
  apellido_materno VARCHAR(100),
  parentesco VARCHAR(50),
  telefono VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beneficiarios_paciente ON beneficiarios_paciente(id_paciente);

-- ============================================
-- 21. SERVICIOS
-- ============================================
CREATE TABLE IF NOT EXISTS servicios (
  id BIGSERIAL PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_servicios_medico ON servicios(medico_id);

-- ============================================
-- 22. PRECIOS CONSULTA
-- ============================================
CREATE TABLE IF NOT EXISTS precios_consulta (
  id BIGSERIAL PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  precio_regular DECIMAL(10,2),
  precio_miembro DECIMAL(10,2),
  vigente_desde DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_precios_medico ON precios_consulta(medico_id);

-- ============================================
-- 23. MÉDICO ESPECIALIDADES (M:N)
-- ============================================
CREATE TABLE IF NOT EXISTS medico_especialidades (
  id BIGSERIAL PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  especialidad_id BIGINT NOT NULL REFERENCES especialidades(id) ON DELETE CASCADE,
  UNIQUE(medico_id, especialidad_id)
);

CREATE INDEX IF NOT EXISTS idx_medico_especialidades_medico ON medico_especialidades(medico_id);

-- ============================================
-- 24. CURP CACHE
-- ============================================
CREATE TABLE IF NOT EXISTS curp_cache (
  curp VARCHAR(18) PRIMARY KEY,
  datos JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curp_cache_created ON curp_cache(created_at);

-- ============================================
-- 25. PRE-REGISTROS
-- ============================================
CREATE TABLE IF NOT EXISTS pre_registros (
  id SERIAL PRIMARY KEY,
  curp VARCHAR(18) NOT NULL,
  nombre VARCHAR(150),
  apellido_paterno VARCHAR(100),
  apellido_materno VARCHAR(100),
  fecha_nacimiento DATE,
  genero VARCHAR(20),
  email VARCHAR(150),
  telefono VARCHAR(20),
  password VARCHAR(255),
  codigo_postal VARCHAR(5),
  colonia VARCHAR(150),
  municipio VARCHAR(100),
  estado VARCHAR(100),
  ciudad VARCHAR(100),
  direccion TEXT,
  doctor_nombre VARCHAR(200),
  estado_registro VARCHAR(20) DEFAULT 'pendiente',
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pre_registros_curp ON pre_registros (curp);
CREATE INDEX IF NOT EXISTS idx_pre_registros_email ON pre_registros (email);
CREATE INDEX IF NOT EXISTS idx_pre_registros_estado ON pre_registros (estado_registro);

-- ============================================
-- 26. SOLICITUDES WHATSAPP
-- ============================================
CREATE SEQUENCE IF NOT EXISTS folio_seq START 1;

CREATE TABLE IF NOT EXISTS solicitudes (
  id SERIAL PRIMARY KEY,
  folio VARCHAR(20) UNIQUE NOT NULL,
  id_paciente UUID REFERENCES pacientes(id),
  id_medico UUID NOT NULL REFERENCES medicos(id),
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(30) DEFAULT 'pendiente_whatsapp' CHECK (status IN ('pendiente_whatsapp', 'contactado', 'convertido', 'perdido')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_paciente ON solicitudes(id_paciente);
CREATE INDEX IF NOT EXISTS idx_solicitudes_folio ON solicitudes(folio);

-- ============================================
-- 27. DISPONIBILIDAD MÉDICO
-- ============================================
CREATE TABLE IF NOT EXISTS disponibilidad_medico (
  id SERIAL PRIMARY KEY,
  id_medico UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disponibilidad_medico ON disponibilidad_medico(id_medico);

-- ============================================
-- 28. TAREAS PENDIENTES
-- ============================================
CREATE TABLE IF NOT EXISTS tareas_pendientes (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  prioridad VARCHAR(20) DEFAULT 'media',
  estado VARCHAR(30) DEFAULT 'pendiente',
  asignado_a VARCHAR(200),
  observaciones JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 29. ACTUALIZACIONES SISTEMA
-- ============================================
CREATE TABLE IF NOT EXISTS actualizaciones_sistema (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) DEFAULT 'mejora',
  version VARCHAR(20),
  estado VARCHAR(30) DEFAULT 'publicado',
  creado_por VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 30. USUARIOS SISTEMA + ROLES
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  id_rol INTEGER REFERENCES roles(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROLES POR DEFECTO
-- ============================================
INSERT INTO roles (nombre) VALUES ('admin'), ('editor'), ('visualizador') ON CONFLICT DO NOTHING;

-- ============================================
-- USUARIO ADMIN POR DEFECTO (password: admin123)
-- ============================================
INSERT INTO usuarios_sistema (nombre, email, password_hash, id_rol, activo)
SELECT 'Administrador', 'admin@mediprotect.com.mx',
  '$2a$10$placeholder_hash_reemplazar_por_hash_real',
  (SELECT id FROM roles WHERE nombre = 'admin'),
  true
WHERE NOT EXISTS (SELECT 1 FROM usuarios_sistema WHERE email = 'admin@mediprotect.com.mx');

-- ============================================
-- TABLA DE PACIENTES (referenciada por multi-tenant)
-- NO CONFUNDIR CON LA TABLA principal de pacientes
-- ============================================
-- (ya creada arriba)

-- ============================================
-- FIN DEL SCHEMA
-- ============================================
