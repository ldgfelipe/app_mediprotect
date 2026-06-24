-- MediProtect - Tablas adicionales: Planes, Empresas, Pagos

-- Paquetes / Planes de suscripción
CREATE TABLE IF NOT EXISTS paquetes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  duracion_dias INTEGER DEFAULT 30,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Beneficios de cada paquete
CREATE TABLE IF NOT EXISTS paquete_beneficios (
  id SERIAL PRIMARY KEY,
  id_paquete INTEGER NOT NULL REFERENCES paquetes(id) ON DELETE CASCADE,
  beneficio TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Asignación de paquete a paciente
CREATE TABLE IF NOT EXISTS paciente_paquete (
  id SERIAL PRIMARY KEY,
  id_paciente UUID NOT NULL REFERENCES pacientes(id),
  id_paquete INTEGER NOT NULL REFERENCES paquetes(id),
  fecha_inicio TIMESTAMP DEFAULT NOW(),
  fecha_fin TIMESTAMP,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Empresas aliadas
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
  activo BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pagos de pacientes
CREATE TABLE IF NOT EXISTS pagos (
  id SERIAL PRIMARY KEY,
  id_paciente UUID REFERENCES pacientes(id),
  id_paquete INTEGER REFERENCES paquetes(id),
  monto DECIMAL(10,2) NOT NULL,
  metodo_pago VARCHAR(50),
  referencia VARCHAR(200),
  estatus VARCHAR(30) DEFAULT 'pendiente' CHECK (estatus IN ('pendiente', 'completado', 'fallido', 'reembolsado')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_paquete_beneficios_paquete ON paquete_beneficios(id_paquete);
CREATE INDEX IF NOT EXISTS idx_paciente_paquete_paciente ON paciente_paquete(id_paciente);
CREATE INDEX IF NOT EXISTS idx_pagos_paciente ON pagos(id_paciente);
CREATE INDEX IF NOT EXISTS idx_pagos_estatus ON pagos(estatus);
