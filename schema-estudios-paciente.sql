-- Agregar campo de estudios a pacientes
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS estudios JSONB DEFAULT '[]'::jsonb;
