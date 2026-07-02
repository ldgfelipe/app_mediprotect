-- Tabla de solicitudes pre-WhatsApp (Fase 1)
-- Captura datos del paciente antes de redirigir a WhatsApp

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
