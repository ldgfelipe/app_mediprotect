-- ============================================
-- TABLAS: Calificaciones y Comisiones
-- ============================================

-- Tabla de calificaciones (paciente califica médico, médico califica paciente)
CREATE TABLE IF NOT EXISTS calificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cita_id UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('paciente', 'medico')),
  calificacion SMALLINT NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cita_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_calificaciones_cita ON calificaciones(cita_id);
CREATE INDEX IF NOT EXISTS idx_calificaciones_tipo ON calificaciones(tipo);

-- Tabla de comisiones de médicos
CREATE TABLE IF NOT EXISTS comisiones_medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cita_id UUID NOT NULL UNIQUE REFERENCES citas(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  monto DECIMAL(10,2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'cancelada')),
  pagada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comisiones_medico ON comisiones_medicos(medico_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_estado ON comisiones_medicos(estado);

-- Columnas para calificaciones en médicos
ALTER TABLE medicos
  ADD COLUMN IF NOT EXISTS calificacion_promedio NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_calificaciones INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_comisiones DECIMAL(10,2) DEFAULT 0;

-- Columnas para calificaciones en pacientes
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS calificacion_promedio NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_calificaciones INTEGER DEFAULT 0;

-- Columna para recordatorio en citas
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS recordatorio_enviado BOOLEAN DEFAULT false;

-- Índices
CREATE INDEX IF NOT EXISTS idx_calificaciones_medico ON calificaciones(cita_id) WHERE tipo = 'paciente';
CREATE INDEX IF NOT EXISTS idx_comisiones_medico_estado ON comisiones_medicos(medico_id, estado);