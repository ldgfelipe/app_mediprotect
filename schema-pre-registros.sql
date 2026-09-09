-- ============================================
-- Pre-registros: intentos de registro pendientes
-- ============================================

CREATE TABLE IF NOT EXISTS pre_registros (
  id SERIAL PRIMARY KEY,
  curp VARCHAR(18) NOT NULL,
  nombre VARCHAR(150),
  apellido_paterno VARCHAR(100),
  apellido_materno VARCHAR(100),
  fecha_nacimiento DATE,
  genero VARCHAR(20),
  email VARCHAR(150),
  telefono VARCHAR(20),
  password VARCHAR(255),
  codigo_postal VARCHAR(5),
  colonia VARCHAR(150),
  municipio VARCHAR(100),
  estado VARCHAR(100),
  ciudad VARCHAR(100),
  direccion TEXT,
  doctor_nombre VARCHAR(200),
  estado_registro VARCHAR(20) DEFAULT 'pendiente', -- pendiente, completado, expirado
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pre_registros_curp ON pre_registros (curp);
CREATE INDEX IF NOT EXISTS idx_pre_registros_email ON pre_registros (email);
CREATE INDEX IF NOT EXISTS idx_pre_registros_estado ON pre_registros (estado_registro);
