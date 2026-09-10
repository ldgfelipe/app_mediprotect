-- ============================================
-- Migración: Tabla consultorios + google_maps_url en empresas
-- ============================================

-- Tabla de consultorios (multi-ubicación por médico)
CREATE TABLE IF NOT EXISTS consultorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_medico UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  nombre VARCHAR(200),
  direccion TEXT,
  codigo_postal VARCHAR(10),
  colonia VARCHAR(200),
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

-- URL de Google Maps en empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
