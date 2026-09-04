-- ============================================================
-- MIGRACION: Registro de medico con CURP + revision de codigo postal
-- Fecha: 2026-08-28
-- Ejecutar en Supabase SQL Editor. Es idempotente (IF NOT EXISTS),
-- se puede correr sin importar si ya se aplico parcialmente.
-- ============================================================

-- ============================================================
-- MEDICOS: CURP y domicilio del consultorio (codigo postal / SEPOMEX)
-- ============================================================

-- CURP del medico (18 caracteres, se guarda en mayusculas)
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS curp VARCHAR(18);

-- Domicilio del consultorio revisado por codigo postal
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(10);
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS colonia VARCHAR(200);

-- Indice para busquedas por CURP
CREATE INDEX IF NOT EXISTS idx_medicos_curp ON medicos(curp);

-- ============================================================
-- PACIENTES: Colonia del codigo postal
-- ============================================================

ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS colonia VARCHAR(150);

CREATE INDEX IF NOT EXISTS idx_pacientes_colonia ON pacientes(colonia);