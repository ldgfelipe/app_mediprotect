-- ============================================================
-- MIGRACION: Campo colonia para pacientes
-- Fecha: 2026-08-26
-- ============================================================

-- Campo colonia (colonia o asentamiento del codigo postal)
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS colonia VARCHAR(150);
