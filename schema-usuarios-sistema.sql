-- ============================================
-- Migración: Tablas de usuarios del sistema y roles
-- Ejecutar en producción si no existen
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  id_rol INTEGER REFERENCES roles(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles por defecto
INSERT INTO roles (nombre) VALUES ('admin'), ('editor'), ('visualizador') ON CONFLICT DO NOTHING;

-- Verificar si el admin default ya tiene un hash válido
-- Si el hash es placeholder, actualizarlo con hash real de 'admin123'
DO $$
DECLARE
  real_hash TEXT := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
BEGIN
  IF EXISTS (SELECT 1 FROM usuarios_sistema WHERE email = 'admin@mediprotect.com.mx' AND password_hash LIKE '%placeholder%') THEN
    UPDATE usuarios_sistema SET password_hash = real_hash WHERE email = 'admin@mediprotect.com.mx';
  END IF;

  -- Si no existe admin, crearlo
  IF NOT EXISTS (SELECT 1 FROM usuarios_sistema WHERE email = 'admin@mediprotect.com.mx') THEN
    INSERT INTO usuarios_sistema (nombre, email, password_hash, id_rol, activo)
    VALUES ('Administrador', 'admin@mediprotect.com.mx', real_hash,
      (SELECT id FROM roles WHERE nombre = 'admin'), true);
  END IF;
END $$;
