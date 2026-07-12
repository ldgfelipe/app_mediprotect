-- Agregar campos de afiliación gratuita
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS como_nos_conociste VARCHAR(50);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS acepta_terminos BOOLEAN DEFAULT false;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS acepta_marketing BOOLEAN DEFAULT false;

-- Agregar campos de contratación plan de pago (seguro)
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS curp VARCHAR(18);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(20);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS ocupacion VARCHAR(100);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS beneficiario_nombre VARCHAR(150);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS beneficiario_parentesco VARCHAR(50);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS beneficiario_telefono VARCHAR(20);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS identificacion_tipo VARCHAR(20);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS identificacion_numero VARCHAR(30);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS acepta_seguro BOOLEAN DEFAULT false;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS plan_contratado VARCHAR(20); -- basico, esencial, integral, elite
