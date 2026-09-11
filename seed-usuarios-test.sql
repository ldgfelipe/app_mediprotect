-- ============================================
-- SEED: Usuarios de prueba para BASE DE TEST
-- Ejecutar en Supabase SQL Editor (test DB)
-- ============================================

-- Agregar UNIQUE constraint si no existe (requerido para ON CONFLICT)
DO $$ BEGIN
  ALTER TABLE roles ADD CONSTRAINT roles_nombre_unique UNIQUE (nombre);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============================================
-- 1. ASEGURAR ROLES EXISTAN
-- ============================================
INSERT INTO roles (nombre)
SELECT 'admin' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'admin');
INSERT INTO roles (nombre)
SELECT 'editor' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'editor');
INSERT INTO roles (nombre)
SELECT 'visualizador' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'visualizador');
INSERT INTO roles (nombre)
SELECT 'Administrador' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'Administrador');
INSERT INTO roles (nombre)
SELECT 'Editor' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'Editor');
INSERT INTO roles (nombre)
SELECT 'Visualizador' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'Visualizador');

-- ============================================
-- 2. ADMINISTRADORES
-- ============================================
-- Admin 1: hola@mediprotect.com.mx / Mobiltoo11+
INSERT INTO usuarios_sistema (id, nombre, email, password_hash, id_rol, activo)
SELECT gen_random_uuid(), 'Admin Hola', 'hola@mediprotect.com.mx',
       '$2b$10$5rD7BRYk4PuwFTwYPx9E../3FikKxLfk0wueRKj3rIGZvbPp140iK',
       (SELECT id FROM roles WHERE nombre IN ('Administrador', 'admin') LIMIT 1), true
WHERE NOT EXISTS (SELECT 1 FROM usuarios_sistema WHERE email = 'hola@mediprotect.com.mx');

-- Admin 2: ldgfelipe@mediprotect.com.mx / felret2720
INSERT INTO usuarios_sistema (id, nombre, email, password_hash, id_rol, activo)
SELECT gen_random_uuid(), 'Admin Felipe', 'ldgfelipe@mediprotect.com.mx',
       '$2b$10$Q7yWkT5EFVwSj5/HSkJJc.Dw1OL/Rd3POzt6d6BiNj5kD04cfmBZO',
       (SELECT id FROM roles WHERE nombre IN ('Administrador', 'admin') LIMIT 1), true
WHERE NOT EXISTS (SELECT 1 FROM usuarios_sistema WHERE email = 'ldgfelipe@mediprotect.com.mx');

-- ============================================
-- 3. ASISTENTE
-- ============================================
-- Asistente: asistente@mediprotect.com.mx / asistente123
INSERT INTO asistentes (id, nombre, apellido, email, telefono, password_hash, activo)
SELECT gen_random_uuid(), 'Asistente', 'General', 'asistente@mediprotect.com.mx', '2221234567',
       '$2b$10$qJB15oFIah9AKco6m.kOwOPlzfZjvyYS9jrbU7zrKSJFwggiT8xgK', true
WHERE NOT EXISTS (SELECT 1 FROM asistentes WHERE email = 'asistente@mediprotect.com.mx');

-- ============================================
-- 4. PACIENTES DE PRUEBA (email confirmado)
-- ============================================
-- Paciente 1
INSERT INTO pacientes (id, nombre, apellido, email, password_hash, telefono, email_confirmado, activo, plan_contratado)
SELECT gen_random_uuid(), 'Maria', 'Lopez Garcia', 'maria.test@mediprotect.com.mx',
       '$2b$10$RK0VkwceT5DtwGXzVr.IG.FFwBPOT/o2sTwFPoMasuzYO6FUclmm2',
       '2221112233', true, true, 'basico'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE email = 'maria.test@mediprotect.com.mx');

-- Paciente 2
INSERT INTO pacientes (id, nombre, apellido, email, password_hash, telefono, email_confirmado, activo, plan_contratado)
SELECT gen_random_uuid(), 'Carlos', 'Hernandez Ruiz', 'carlos.test@mediprotect.com.mx',
       '$2b$10$RK0VkwceT5DtwGXzVr.IG.FFwBPOT/o2sTwFPoMasuzYO6FUclmm2',
       '2223334455', true, true, 'esencial'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE email = 'carlos.test@mediprotect.com.mx');

-- Paciente 3
INSERT INTO pacientes (id, nombre, apellido, email, password_hash, telefono, email_confirmado, activo, plan_contratado)
SELECT gen_random_uuid(), 'Ana', 'Martinez Diaz', 'ana.test@mediprotect.com.mx',
       '$2b$10$RK0VkwceT5DtwGXzVr.IG.FFwBPOT/o2sTwFPoMasuzYO6FUclmm2',
       '2224445566', true, true, 'integral'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE email = 'ana.test@mediprotect.com.mx');

-- Paciente 4
INSERT INTO pacientes (id, nombre, apellido, email, password_hash, telefono, email_confirmado, activo, plan_contratado)
SELECT gen_random_uuid(), 'Roberto', 'Sanchez Perez', 'roberto.test@mediprotect.com.mx',
       '$2b$10$RK0VkwceT5DtwGXzVr.IG.FFwBPOT/o2sTwFPoMasuzYO6FUclmm2',
       '2225556677', true, true, 'elite'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE email = 'roberto.test@mediprotect.com.mx');

-- Paciente 5
INSERT INTO pacientes (id, nombre, apellido, email, password_hash, telefono, email_confirmado, activo, plan_contratado)
SELECT gen_random_uuid(), 'Laura', 'Fernandez Castro', 'laura.test@mediprotect.com.mx',
       '$2b$10$RK0VkwceT5DtwGXzVr.IG.FFwBPOT/o2sTwFPoMasuzYO6FUclmm2',
       '2226667788', true, true, 'basico'
WHERE NOT EXISTS (SELECT 1 FROM pacientes WHERE email = 'laura.test@mediprotect.com.mx');
