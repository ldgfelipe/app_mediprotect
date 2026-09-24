-- ============================================================
-- SEED COMPLEMENTARIO: TODAS LAS ESPECIALIDADES DEL DIRECTORIO
-- ============================================================

-- 1. Insertar especialidades faltantes
INSERT INTO especialidades (nombre, slug, icono) VALUES
  ('Oncologia',                     'oncologia',                      'fa-solid fa-ribbon'),
  ('Psiquiatria',                   'psiquiatria',                    'fa-solid fa-pills'),
  ('Reumatologia',                  'reumatologia',                   'fa-solid fa-bone'),
  ('Salud Auditiva',                'salud-auditiva',                 'fa-solid fa-ear-listen'),
  ('Terapia de Infusion Intravenosa','terapia-de-infusion-intravenosa','fa-solid fa-droplet'),
  ('Traumatologia y Ortopedia',     'traumatologia-ortopedia',        'fa-solid fa-bone')
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- ALERGIA E INMUNOLOGIA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('carlos-ramirez-mendoza', 'Dr.', 'Carlos', 'Ramirez Mendoza', 'carlos.ramirez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '12345678', (SELECT id FROM especialidades WHERE slug = 'alergia-e-inmunologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Alergologo e Inmunologo', 'Puebla', 'Puebla', '522228021933', true),
('maria-elena-torres', 'Dra.', 'Maria Elena', 'Torres', 'maria.torres@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '87654321', (SELECT id FROM especialidades WHERE slug = 'alergia-e-inmunologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Inmunologa Pediatrica', 'Puebla', 'Puebla', '522228021933', true),
('jose-antonio-vega', 'Dr.', 'Jose Antonio', 'Vega', 'jose.vega@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '56781234', (SELECT id FROM especialidades WHERE slug = 'alergia-e-inmunologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Alergologo Clinico', 'Puebla', 'Puebla', '522228021933', true),
('natalia-valdes-gonzalez', 'Dra.', 'Natalia Elizabeth', 'Valdes Gonzalez', 'natalia.valdes@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '15097431', (SELECT id FROM especialidades WHERE slug = 'alergia-e-inmunologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Alergia e Inmunologia / Pediatria', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ACUPUNTURA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, destacado, activo) VALUES
('cintia-flores-pichardo', 'Dra.', 'Cintia Elisa', 'Flores Pichardo', 'cintia.flores@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '9025547 | 11043723', (SELECT id FROM especialidades WHERE slug = 'acupuntura'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Acupuntura', 'Puebla', 'Puebla', '522228021933', true, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- BARIATRIA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('erasmo-vega-osorio', 'Dr.', 'Erasmo Aaron', 'Vega Osorio', 'erasmo.vega@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '9327924', (SELECT id FROM especialidades WHERE slug = 'bariatria'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Cirujano Bariatra', 'Puebla', 'Puebla', '522228021933', true),
('patricia-lopez-ruiz', 'Dra.', 'Patricia', 'Lopez Ruiz', 'patricia.lopezr@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '34567890', (SELECT id FROM especialidades WHERE slug = 'bariatria'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Nutriologa Bariatra', 'Puebla', 'Puebla', '522228021933', true),
('fernando-ortega-cruz', 'Dr.', 'Fernando', 'Ortega Cruz', 'fernando.ortega@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '45678901', (SELECT id FROM especialidades WHERE slug = 'bariatria'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Cirujano Bariatra', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- CARDIOLOGIA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('alejandro-mendoza-rios', 'Dr.', 'Alejandro', 'Mendoza Rios', 'alejandro.mendoza@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '78901234', (SELECT id FROM especialidades WHERE slug = 'cardiologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Cardiologo Clinico', 'Puebla', 'Puebla', '522228021933', true),
('gabriela-herrera-soto', 'Dra.', 'Gabriela', 'Herrera Soto', 'gabriela.herrera@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '89012345', (SELECT id FROM especialidades WHERE slug = 'cardiologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Cardiologa Intervencionista', 'Puebla', 'Puebla', '522228021933', true),
('luis-castillo', 'Dr.', 'Luis Fernando', 'Castillo', 'luis.castillo@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '90123456', (SELECT id FROM especialidades WHERE slug = 'cardiologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Ecocardiografista', 'Puebla', 'Puebla', '522228021933', true),
('pedro-diaz-garcia', 'Dr.', 'Pedro', 'Diaz Garcia', 'pedro.diazg@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '12517026', (SELECT id FROM especialidades WHERE slug = 'cardiologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Cardiologo', 'Puebla', 'Puebla', '522228021933', true),
('oscar-santos-garcia', 'Dr.', 'Oscar de los', 'Santos Garcia', 'oscar.santos@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '9781846', (SELECT id FROM especialidades WHERE slug = 'cardiologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Cardiologo', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- CIRUGIA PLASTICA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('eduardo-villanueva-parra', 'Dr.', 'Eduardo', 'Villanueva Parra', 'eduardo.villanueva@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '44556677', (SELECT id FROM especialidades WHERE slug = 'cirugia-plastica'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Cirujano Plastico', 'Puebla', 'Puebla', '522228021933', true),
('sofia-quintana-rojas', 'Dra.', 'Sofia', 'Quintana Rojas', 'sofia.quintana@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '55667788', (SELECT id FROM especialidades WHERE slug = 'cirugia-plastica'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Cirujana Plastica Reconstructiva', 'Puebla', 'Puebla', '522228021933', true),
('ricardo-alvarez-quiroz', 'Dr.', 'Ricardo', 'Alvarez Quiroz', 'ricardo.alvarez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '4137487 | 10229994', (SELECT id FROM especialidades WHERE slug = 'cirugia-plastica'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Cirugia Plastica, Estetica y Reconstructiva', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- COACHING
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('andrea-gomez-castillo', 'Lic.', 'Andrea', 'Gomez Castillo', 'andrea.gomez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'coaching'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Coach de Salud y Bienestar', 'Puebla', 'Puebla', '522228021933', true),
('miguel-torres', 'Dr.', 'Miguel Angel', 'Torres', 'miguel.torres@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'coaching'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Coach Nutricional', 'Puebla', 'Puebla', '522228021933', true),
('david-harrison', '', 'David', 'Harrison', 'david.harrison@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'coaching'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Especialidad en Coaching', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- CIRUGIA PEDIATRICA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('javier-espinoza-rios', 'Dr.', 'Javier', 'Espinoza Rios', 'javier.espinoza@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '88990011', (SELECT id FROM especialidades WHERE slug = 'cirugia-pediatrica'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Cirujano Pediatra', 'Puebla', 'Puebla', '522228021933', true),
('carmen-delgado-valle', 'Dra.', 'Carmen', 'Delgado Valle', 'carmen.delgado@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '99001122', (SELECT id FROM especialidades WHERE slug = 'cirugia-pediatrica'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Cirujana Neonatal', 'Puebla', 'Puebla', '522228021933', true),
('raquel-najem-gonzalez', 'Dra.', 'Raquel', 'Najem Gonzalez', 'raquel.najem@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '7240369 | 13355116', (SELECT id FROM especialidades WHERE slug = 'cirugia-pediatrica'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Cirugia Pediatrica / Pediatria', 'Puebla', 'Puebla', '522228021933', true),
('daniela-morales-lopez', 'Dra.', 'Daniela Carolina', 'Morales Lopez', 'daniela.morales@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '8536634', (SELECT id FROM especialidades WHERE slug = 'cirugia-pediatrica'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Cirugia Pediatrica', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- CURACION DE HERIDAS
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('isabel-nunez-garcia', 'Dra.', 'Isabel', 'Nunez Garcia', 'isabel.nunez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '11223355', (SELECT id FROM especialidades WHERE slug = 'curacion-de-heridas'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Especialista en Heridas', 'Puebla', 'Puebla', '522228021933', true),
('tomas-aguilar-rosas', 'Dr.', 'Tomas', 'Aguilar Rosas', 'tomas.aguilar@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '22334466', (SELECT id FROM especialidades WHERE slug = 'curacion-de-heridas'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Terapeuta de Estomas', 'Puebla', 'Puebla', '522228021933', true),
('sergio-torres-vazquez', 'Enf. Esp.', 'Sergio', 'Torres Vazquez', 'sergio.torresv@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '8132500', (SELECT id FROM especialidades WHERE slug = 'curacion-de-heridas'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Curacion de Heridas y Estomas', 'Puebla', 'Puebla', '522228021933', true),
('gabriela-juarez-mejia', 'Enf.', 'Gabriela', 'Juarez Mejia', 'gabriela.juarez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '10425120', (SELECT id FROM especialidades WHERE slug = 'curacion-de-heridas'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Curacion de Heridas y Estomas', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- DERMATOLOGIA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('ricardo-hernandez-soto', 'Dr.', 'Ricardo', 'Hernandez Soto', 'ricardo.hernandezs@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '76543210', (SELECT id FROM especialidades WHERE slug = 'dermatologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Dermatologo Clinico', 'Puebla', 'Puebla', '522228021933', true),
('leongeli-grajeda-medina', 'Dra.', 'Leongeli', 'Grajeda Medina', 'leongeli.grajeda@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '15121251', (SELECT id FROM especialidades WHERE slug = 'dermatologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Dermatologa', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ECOGRAFIA / ULTRASONIDO
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, id_especialidad, centro_id, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('arturo-munoz-cortes', '', 'Arturo', 'Munoz Cortes', 'arturo.munoz@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'ecografia-ultrasonido'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ENFERMERIA OBSTETRICA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('laura-hernandez-vega', 'Lic.', 'Laura', 'Hernandez Vega', 'laura.hernandezv@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'enfermeria-obstetrica'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Enfermera Obstetra', 'Puebla', 'Puebla', '522228021933', true),
('deyxi-martinez-romero', '', 'Deyci Xiomara', 'Martinez Romero', 'deyxi.martinez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'enfermeria-obstetrica'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Enfermeria', 'Puebla', 'Puebla', '522228021933', true),
('martha-orozco-diaz', 'Lic.', 'Martha', 'Orozco Diaz', 'martha.orozco@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'enfermeria-obstetrica'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Enfermera Perinatal', 'Puebla', 'Puebla', '522228021933', true),
('yenny-pabon-vaquero', '', 'Yenny Paola', 'Pabon Vaquero', 'yenny.pabon@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'enfermeria-obstetrica'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Enfermeria', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- FISIOTERAPIA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('carlos-mejia-flores', 'Lic.', 'Carlos', 'Mejia Flores', 'carlos.mejia@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '55667799', (SELECT id FROM especialidades WHERE slug = 'fisioterapia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Fisioterapeuta Deportivo', 'Puebla', 'Puebla', '522228021933', true),
('adriana-rios-campos', 'Lic.', 'Adriana', 'Rios Campos', 'adriana.rios@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '66778800', (SELECT id FROM especialidades WHERE slug = 'fisioterapia'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Fisioterapeuta Neurologica', 'Puebla', 'Puebla', '522228021933', true),
('karina-paredes-perez', 'Lic.', 'Karina', 'Paredes Perez', 'karina.paredes@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '13868313', (SELECT id FROM especialidades WHERE slug = 'fisioterapia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Fisioterapia Ortopedica y Deportiva', 'Puebla', 'Puebla', '522228021933', true),
('shareni-osorio-vazquez', '', 'Shareni', 'Osorio Vazquez', 'shareni.osorio@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '8109864', (SELECT id FROM especialidades WHERE slug = 'fisioterapia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Fisioterapia - Neurorehabilitacion', 'Puebla', 'Puebla', '522228021933', true),
('edith-garcia-carrasco', 'Lic.', 'Edith', 'Garcia Carrasco', 'edith.garcia@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '12057345', (SELECT id FROM especialidades WHERE slug = 'fisioterapia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Fisioterapia', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- GINECOLOGIA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('patricia-lopez-mendoza', 'Dra.', 'Patricia', 'Lopez Mendoza', 'patricia.lopez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '34567890', (SELECT id FROM especialidades WHERE slug = 'ginecologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Ginecologa - Obstetra', 'Puebla', 'Puebla', '522228021933', true),
('jorge-ramirez-olvera', 'Dr.', 'Jorge', 'Ramirez Olvera', 'jorge.ramirez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '45678901', (SELECT id FROM especialidades WHERE slug = 'ginecologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Ginecologo Oncologico', 'Puebla', 'Puebla', '522228021933', true),
('carmen-delgado-ruiz', 'Dra.', 'Carmen', 'Delgado Ruiz', 'carmen.delgado.ruiz@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '56789012', (SELECT id FROM especialidades WHERE slug = 'ginecologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Ginecologa - Colposcopista', 'Puebla', 'Puebla', '522228021933', true),
('blanca-garcia-moreno', 'Dra.', 'Blanca Estela', 'Garcia Moreno', 'blanca.garcia@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '3833630', (SELECT id FROM especialidades WHERE slug = 'ginecologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Ginecologia y Obstetricia', 'Puebla', 'Puebla', '522228021933', true),
('raul-rodriguez-zozoaga', 'Dr.', 'Raul', 'Rodriguez Zozoaga', 'raul.rodriguez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '2608991', (SELECT id FROM especialidades WHERE slug = 'ginecologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Ginecologia y Obstetricia', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- MEDICINA FAMILIAR
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('fernando-castillo-ruiz', 'Dr.', 'Fernando', 'Castillo Ruiz', 'fernando.castillo@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'medicina-familiar'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico Familiar', 'Puebla', 'Puebla', '522228021933', true),
('rosa-maria-vega', 'Dra.', 'Rosa Maria', 'Vega', 'rosa.vega@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'medicina-familiar'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Medico Familiar - Geriatria', 'Puebla', 'Puebla', '522228021933', true),
('jose-antonio-mendez', 'Dr.', 'Jose Antonio', 'Mendez', 'jose.mendez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'medicina-familiar'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico Familiar', 'Puebla', 'Puebla', '522228021933', true),
('marlenne-barrios-aparicio', 'Dra.', 'Marlenne Yolanda', 'Barrios Aparicio', 'marlenne.barrios@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'medicina-familiar'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico Familiar', 'Puebla', 'Puebla', '522228021933', true),
('dalay-vazquez-martinez', 'Dr.', 'Dalay', 'Vazquez Martinez', 'dalay.vazquez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'medicina-familiar'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico Familiar - Dolor Cronico y Heridas', 'Puebla', 'Puebla', '522228021933', true),
('erika-carmona-aguilar', 'Dra.', 'Erika Kareni', 'Carmona Aguilar', 'erika.carmona@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'medicina-familiar'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico Familiar', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- MEDICINA ESTETICA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('mariana-estrada-leon', 'Dra.', 'Mariana', 'Estrada Leon', 'mariana.estrada@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'medicina-estetica'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico Estetico', 'Puebla', 'Puebla', '522228021933', true),
('alejandro-fuentes-mora', 'Dr.', 'Alejandro', 'Fuentes Mora', 'alejandro.fuentes@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'medicina-estetica'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Medico Estetico - Dermatologo', 'Puebla', 'Puebla', '522228021933', true),
('isabel-contreras-gil', 'Dra.', 'Isabel', 'Contreras Gil', 'isabel.contreras@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'medicina-estetica'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico Estetico', 'Puebla', 'Puebla', '522228021933', true),
('bertha-adel-dominguez', 'Dra.', 'Bertha Guadalupe', 'Adel Dominguez', 'bertha.adel@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'medicina-estetica'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medicina Estetica y Longevidad', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- MEDICINA GENERAL (adicionales a los ya existentes)
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('ricardo-galindo-pena', 'Dr.', 'Ricardo', 'Galindo Pena', 'ricardo.galindo@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '12345678', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General', 'Puebla', 'Puebla', '522228021933', true),
('laura-cordova', 'Dra.', 'Laura Elena', 'Cordova', 'laura.cordova@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '23456789', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Medico General - Nutriologia', 'Puebla', 'Puebla', '522228021933', true),
('miguel-angel-rios', 'Dr.', 'Miguel Angel', 'Rios', 'miguel.angel.rios@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '34567890', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General', 'Puebla', 'Puebla', '522228021933', true),
('jaime-alonso-costa', 'Dr.', 'Jaime', 'Alonso Costa', 'jaime.alonso@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '3551297', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General', 'Puebla', 'Puebla', '522228021933', true),
('esmeralda-alonso-guerrero', 'Dra.', 'Esmeralda', 'Alonso Guerrero', 'esmeralda.alonso@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '7241548', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General', 'Puebla', 'Puebla', '522228021933', true),
('erika-barriga-munoz', 'Dra.', 'Erika', 'Barriga Munoz', 'erika.barriga@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '3798213', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General - Estetica y Alopecia', 'Puebla', 'Puebla', '522228021933', true),
('karen-bautista-orduno', 'Dra.', 'Karen Gabriela', 'Bautista Orduno', 'karen.bautista@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '11569648', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General', 'Puebla', 'Puebla', '522228021933', true),
('alexis-carrasco-sosa', 'Dra.', 'Alexis', 'Carrasco Sosa', 'alexis.carrasco@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '12098253', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General', 'Puebla', 'Puebla', '522228021933', true),
('ana-chavez-serna', 'Dra.', 'Ana Karen', 'Chavez Serna', 'ana.chavez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '12841815', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General - Manejo del Dolor y Medicina Deportiva', 'Puebla', 'Puebla', '522228021933', true),
('juan-barron-momox', 'Dr.', 'Juan Fernando', 'Barron Momox', 'juan.barron@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '12037296', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General', 'Puebla', 'Puebla', '522228021933', true),
('javier-chavez-zavala', 'Dr.', 'Javier', 'Chavez Zavala', 'javier.chavezz@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '5241293', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General - Medicina Preventiva', 'Puebla', 'Puebla', '522228021933', true),
('linda-flores-rodriguez', 'Dra.', 'Linda Edith', 'Flores Rodriguez', 'linda.flores@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '8579941', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medicina Fisica y Rehabilitacion', 'Puebla', 'Puebla', '522228021933', true),
('gerardo-gonzalez-ramirez', 'Dr.', 'Gerardo de Jesus', 'Gonzalez Ramirez', 'gerardo.gonzalez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '14969974', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General', 'Puebla', 'Puebla', '522228021933', true),
('guadalupe-lopez-leon', 'Dra.', 'Maria Guadalupe', 'Lopez Leon', 'guadalupe.lopez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '5341497', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General - Obesidad y Diabetes', 'Puebla', 'Puebla', '522228021933', true),
('hector-herrera-martinez', 'Dr.', 'Hector Manuel', 'Herrera Martinez', 'hector.herrera@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '10248096', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General - Aparato Digestivo', 'Puebla', 'Puebla', '522228021933', true),
('luis-hernandez-vazquez', 'Dr.', 'Luis Angel', 'Hernandez Vazquez', 'luis.hernandezv@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '14628092', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico General y Comunitario', 'Puebla', 'Puebla', '522228021933', true),
('sofia-narvaez-chavez', 'Dra.', 'Sofia Mercedes', 'Narvaez Chavez', 'sofia.narvaez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '12002255', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico Cirujano', 'Puebla', 'Puebla', '522228021933', true),
('rosa-nunez-rodriguez', 'Dra.', 'Rosa Gabriel', 'Nunez Rodriguez', 'rosa.nunez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '13120859', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico Cirujano', 'Puebla', 'Puebla', '522228021933', true),
('mario-vargas-rodriguez', 'Dr.', 'Mario', 'Vargas Rodriguez', 'mario.vargas@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '1010637', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico Cirujano', 'Puebla', 'Puebla', '522228021933', true),
('fernando-morales-sanchez', 'Dr.', 'Fernando', 'Morales Sanchez', 'fernando.moraless@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '0616802', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medico Cirujano', 'Puebla', 'Puebla', '522228021933', true),
('ana-hernandez-nieto', 'Dra.', 'Ana Karen', 'Hernandez Nieto', 'ana.hernandezn@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '8354905', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medicina del Trabajo y Ambiental', 'Puebla', 'Puebla', '522228021933', true),
('america-moreno-texcucano', 'Dra.', 'America Beatriz', 'Moreno Texcucano', 'america.moreno@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '7786350', (SELECT id FROM especialidades WHERE slug = 'medicina-general'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Medicina Estetica y Regenerativa', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- NEFROLOGIA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('ricardo-marquez-gil', 'Dr.', 'Ricardo', 'Marquez Gil', 'ricardo.marquez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'nefrologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Nefrologo', 'Puebla', 'Puebla', '522228021933', true),
('patricia-vega-luna', 'Dra.', 'Patricia', 'Vega Luna', 'patricia.vega@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'nefrologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Nefrologa - Hipertensiologa', 'Puebla', 'Puebla', '522228021933', true),
('fernando-davalos-pena', 'Dr.', 'Fernando', 'Davalos Pena', 'fernando.davalos@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', (SELECT id FROM especialidades WHERE slug = 'nefrologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Nefrologo', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;
