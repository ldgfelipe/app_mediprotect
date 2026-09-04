-- ============================================================
-- MIGRACION: Campos requeridos por el cliente
-- Fecha: 2026-08-04
-- ============================================================

-- ============================================================
-- PACIENTES: Separar apellido + nuevos campos de contacto
-- ============================================================

-- Separar apellido en paterno y materno
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS apellido_paterno VARCHAR(100);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS apellido_materno VARCHAR(100);

-- Migrar datos existentes del campo 'apellido' a 'apellido_paterno'
UPDATE pacientes SET apellido_paterno = apellido WHERE apellido_paterno IS NULL AND apellido IS NOT NULL;

-- Nuevos campos de domicilio
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(10);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS estado VARCHAR(100);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS municipio VARCHAR(100);

-- Telefono alternativo
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS telefono2 VARCHAR(20);

-- Hospital o consultorio (referencia)
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS hospital_consultorio VARCHAR(200);

-- ============================================================
-- PACIENTES: Tabla de beneficiarios (muchos a uno)
-- ============================================================

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

-- Migrar beneficiario existente (si tiene datos) a la nueva tabla
INSERT INTO beneficiarios_paciente (id_paciente, nombre, parentesco, telefono)
SELECT id, beneficiario_nombre, beneficiario_parentesco, beneficiario_telefono
FROM pacientes
WHERE beneficiario_nombre IS NOT NULL AND beneficiario_nombre != ''
  AND NOT EXISTS (SELECT 1 FROM beneficiarios_paciente WHERE id_paciente = pacientes.id);

-- ============================================================
-- MEDICOS: Separar apellido + nuevos campos
-- ============================================================

-- Separar apellido en paterno y materno
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS apellido_paterno VARCHAR(100);
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS apellido_materno VARCHAR(100);

-- Migrar datos existentes
UPDATE medicos SET apellido_paterno = apellido WHERE apellido_paterno IS NULL AND apellido IS NOT NULL;

-- RFC
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS rfc VARCHAR(13);

-- CURP
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS curp VARCHAR(18);

-- Domicilio del consultorio
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(10);
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS colonia VARCHAR(200);

-- Hospital o consultorio (texto libre)
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS hospital_consultorio VARCHAR(200);

-- Tipo de consulta (presencial, virtual, ambos)
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS tipo_consulta VARCHAR(30) DEFAULT 'presencial';
