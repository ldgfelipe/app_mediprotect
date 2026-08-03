-- Relación empresa-pacientes
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
