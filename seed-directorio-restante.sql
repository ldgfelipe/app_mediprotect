-- ============================================================
-- SEED RESTANTE: especialidades sin doctores
-- ============================================================

-- ============================================================
-- NEUMOLOGIA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('ernesto-salgado-ruiz', 'Dr.', 'Ernesto', 'Salgado Ruiz', 'ernesto.salgado@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '23456789', (SELECT id FROM especialidades WHERE slug = 'neumologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Neumologo', 'Puebla', 'Puebla', '522228021933', true),
('marisol-ordaz-tapia', 'Dra.', 'Marisol', 'Ordaz Tapia', 'marisol.ordaz@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '34567890', (SELECT id FROM especialidades WHERE slug = 'neumologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Neumologa - Medicina del Suenio', 'Puebla', 'Puebla', '522228021933', true),
('adrian-meneses-hoyos', 'Dr.', 'Adrian', 'Meneses Hoyos', 'adrian.meneses@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '45678901', (SELECT id FROM especialidades WHERE slug = 'neumologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Neumologo', 'Puebla', 'Puebla', '522228021933', true),
('jesica-gonzalez-martinez', 'Dra.', 'Jesica', 'Gonzalez Martinez', 'jesica.gonzalez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '11140564', (SELECT id FROM especialidades WHERE slug = 'neumologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Neumologia', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ONCOLOGIA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('antonio-mejia-de-la-garza', 'Dr.', 'Antonio', 'Mejia de la Garza', 'antonio.mejia@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '23456789', (SELECT id FROM especialidades WHERE slug = 'oncologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Oncologo Medico', 'Puebla', 'Puebla', '522228021933', true),
('lorena-altamirano-gil', 'Dra.', 'Lorena', 'Altamirano Gil', 'lorena.altamirano@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '34567890', (SELECT id FROM especialidades WHERE slug = 'oncologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Oncologa - Radioterapeuta', 'Puebla', 'Puebla', '522228021933', true),
('cesar-orozco-linares', 'Dr.', 'Cesar', 'Orozco Linares', 'cesar.orozco@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '45678901', (SELECT id FROM especialidades WHERE slug = 'oncologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Oncologo - Cuidados Paliativos', 'Puebla', 'Puebla', '522228021933', true),
('gabriela-isabel-galeana-aburto', 'Dra.', 'Gabriela Isabel', 'Galeana Aburto', 'gabriela.galeana.onco@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '13456232', (SELECT id FROM especialidades WHERE slug = 'oncologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Cirugia General / Oncologia', 'Puebla', 'Puebla', '522228021933', true),
('daniel-saucedo-conde', 'Dr.', 'Daniel', 'Saucedo Conde', 'daniel.saucedo.onco@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '6249777', (SELECT id FROM especialidades WHERE slug = 'oncologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Cirugia General / Oncologia', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- PSIQUIATRIA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('humberto-cardenas-gil', 'Dr.', 'Humberto', 'Cardenas Gil', 'humberto.cardenas@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '23456789', (SELECT id FROM especialidades WHERE slug = 'psiquiatria'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Psiquiatra', 'Puebla', 'Puebla', '522228021933', true),
('lorena-serna-pacheco', 'Dra.', 'Lorena', 'Serna Pacheco', 'lorena.serna@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '34567890', (SELECT id FROM especialidades WHERE slug = 'psiquiatria'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Psiquiatra - Adolescentes', 'Puebla', 'Puebla', '522228021933', true),
('rafael-posada-noriega', 'Dr.', 'Rafael', 'Posada Noriega', 'rafael.posada@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '45678901', (SELECT id FROM especialidades WHERE slug = 'psiquiatria'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Psiquiatra - Trastornos del Animo', 'Puebla', 'Puebla', '522228021933', true),
('penelope-ireri-dominguez-cabanas', 'Dra.', 'Penelope Ireri', 'Dominguez Cabanas', 'penelope.dominguez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '10116980', (SELECT id FROM especialidades WHERE slug = 'psiquiatria'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Psiquiatria', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- REUMATOLOGIA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('milena-contreras-rueda', 'Dra.', 'Milena', 'Contreras Rueda', 'milena.contreras@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '23456789', (SELECT id FROM especialidades WHERE slug = 'reumatologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Reumatologa', 'Puebla', 'Puebla', '522228021933', true),
('german-soria-del-valle', 'Dr.', 'German', 'Soria del Valle', 'german.soria@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '34567890', (SELECT id FROM especialidades WHERE slug = 'reumatologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Reumatologo - Inmunologo', 'Puebla', 'Puebla', '522228021933', true),
('natalia-del-rio-ponce', 'Dra.', 'Natalia', 'del Rio Ponce', 'natalia.delrio@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '45678901', (SELECT id FROM especialidades WHERE slug = 'reumatologia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Reumatologa Pediatrica', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SALUD AUDITIVA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('ana-karen-monzon-leal', 'Dra.', 'Ana Karen', 'Monzon Leal', 'ana.monzon@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '23456789', (SELECT id FROM especialidades WHERE slug = 'salud-auditiva'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Audiologa', 'Puebla', 'Puebla', '522228021933', true),
('pablo-jauregui-salas', 'Dr.', 'Pablo', 'Jauregui Salas', 'pablo.jauregui@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '34567890', (SELECT id FROM especialidades WHERE slug = 'salud-auditiva'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Otorrinolaringologo', 'Puebla', 'Puebla', '522228021933', true),
('rosa-marina-esquivel-tellez', 'Dra.', 'Rosa Marina', 'Esquivel Tellez', 'rosa.esquivel@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '45678901', (SELECT id FROM especialidades WHERE slug = 'salud-auditiva'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Terapeuta de Lenguaje', 'Puebla', 'Puebla', '522228021933', true),
('said-ernesto-aguirre-rendon', 'Dr.', 'Said Ernesto', 'Aguirre Rendon', 'said.aguirre@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '14008435', (SELECT id FROM especialidades WHERE slug = 'salud-auditiva'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Audiologia, Otoneurologia y Foniatria', 'Puebla', 'Puebla', '522228021933', true),
('francisco-omar-lozano-castillo', '', 'Francisco Omar', 'Lozano Castillo', 'francisco.lozano@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '', (SELECT id FROM especialidades WHERE slug = 'salud-auditiva'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Aparatos Auditivos', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- TERAPIA DE INFUSION INTRAVENOSA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('edwin-sanchez-coral', 'Enf.', 'Edwin', 'Sanchez Coral', 'edwin.sanchez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '9194016', (SELECT id FROM especialidades WHERE slug = 'terapia-de-infusion-intravenosa'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Enfermero Experto en Terapia de Infusion IV', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- TRAUMATOLOGIA Y ORTOPEDIA
-- ============================================================
INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
('roberto-sanchez-linares', 'Dr.', 'Roberto', 'Sanchez Linares', 'roberto.sanchez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '56789012', (SELECT id FROM especialidades WHERE slug = 'traumatologia-ortopedia'), (SELECT id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla'), 'Traumatologo - Ortopedista', 'Puebla', 'Puebla', '522228021933', true),
('mariana-torres-aguilar', 'Dra.', 'Mariana', 'Torres Aguilar', 'mariana.torresa@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '67890123', (SELECT id FROM especialidades WHERE slug = 'traumatologia-ortopedia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Ortopedista Pediatrica', 'Puebla', 'Puebla', '522228021933', true),
('carlos-eduardo-velez', 'Dr.', 'Carlos Eduardo', 'Velez', 'carlos.velez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '78901234', (SELECT id FROM especialidades WHERE slug = 'traumatologia-ortopedia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Traumatologo Deportivo', 'Puebla', 'Puebla', '522228021933', true),
('erick-paredes-gonzalez', 'Dr.', 'Erick', 'Paredes Gonzalez', 'erick.paredes@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '7515823', (SELECT id FROM especialidades WHERE slug = 'traumatologia-ortopedia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Ortopedia y Traumatologia', 'Puebla', 'Puebla', '522228021933', true),
('cesar-augusto-rendon-dircio', 'Dr.', 'Cesar Augusto', 'Rendon Dircio', 'cesar.rendon@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '12600400', (SELECT id FROM especialidades WHERE slug = 'traumatologia-ortopedia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Ortopedia y Traumatologia - Cirugia de Cadera y Rodilla', 'Puebla', 'Puebla', '522228021933', true),
('juan-manuel-rodriguez-gonzalez', 'Dr.', 'Juan Manuel', 'Rodriguez Gonzalez', 'juan.rodriguezg@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '15405009', (SELECT id FROM especialidades WHERE slug = 'traumatologia-ortopedia'), (SELECT id FROM centros_medicos WHERE nombre = 'Mediwork Centro Medico'), 'Traumatologia y Ortopedia - Enfoque Preventivo Articular', 'Puebla', 'Puebla', '522228021933', true)
ON CONFLICT (slug) DO NOTHING;
