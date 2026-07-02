-- ============================================================
-- SEED DATA: DIRECTORIO MÉDICO MEDIPROTECT
-- Inserta médicos del directorio en la tabla medicos
-- ============================================================
-- NOTA: Estos registros son SOLO para el directorio (sin auth).
-- Se crean con email genérico + password temporal.
-- ============================================================

DO $$
DECLARE
  mediwork_id BIGINT;
  la_paz_id BIGINT;
  gen_id BIGINT;
  psi_id BIGINT;
  ped_id BIGINT;
  cir_id BIGINT;
  ger_id BIGINT;
  mi_id BIGINT;
  nut_id BIGINT;
  odon_id BIGINT;
BEGIN
  SELECT id INTO mediwork_id FROM centros_medicos WHERE nombre = 'Mediwork Centro Médico';
  SELECT id INTO la_paz_id FROM centros_medicos WHERE nombre = 'Hospital la Paz Puebla';

  SELECT id INTO gen_id  FROM especialidades WHERE slug = 'medicina-general';
  SELECT id INTO psi_id  FROM especialidades WHERE slug = 'psicologia';
  SELECT id INTO ped_id  FROM especialidades WHERE slug = 'pediatria';
  SELECT id INTO cir_id  FROM especialidades WHERE slug = 'cirugia-general';
  SELECT id INTO ger_id  FROM especialidades WHERE slug = 'geriatria';
  SELECT id INTO mi_id   FROM especialidades WHERE slug = 'medicina-interna';
  SELECT id INTO nut_id  FROM especialidades WHERE slug = 'nutricion';
  SELECT id INTO odon_id FROM especialidades WHERE slug = 'odontologia';

  -- Medicina General
  INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, bio, consultorio_direccion, consultorio_ciudad, consultorio_estado, whatsapp, activo) VALUES
  ('mariana-coca-lezama', 'Dra.', 'Mariana', 'Coca Lezama', 'mariana.coca@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '09705052', gen_id, mediwork_id, 'Médico Cirujano egresada de la BUAP. Atención médica integral en Mediwork Centro Médico.', 'Mediwork Centro Médico', 'Puebla', 'Puebla', '522228021933', true),
  ('andres-ramirez-sanchez', 'Dr.', 'Andrés', 'Ramírez Sánchez', 'andres.ramirez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '14839882', gen_id, mediwork_id, 'Médico Cirujano comprometido con brindar atención médica integral y de calidad.', 'Mediwork Centro Médico', 'Puebla', 'Puebla', '522228021933', true),
  ('julissa-mariana-sanchez-moncada', 'Dra.', 'Julissa Mariana', 'Sánchez Moncada', 'julissa.sanchez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '13060256', gen_id, mediwork_id, 'Médico Cirujano comprometida con brindar atención médica de excelencia basada en la calidez humana.', 'Mediwork Centro Médico', 'Puebla', 'Puebla', '522228021933', true)
  ON CONFLICT (slug) DO NOTHING;

  -- Psicología
  INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, universidad, id_especialidad, centro_id, subespecialidad, frase_inspiradora, bio, consultorio_ciudad, consultorio_estado, activo) VALUES
  ('miriam-aguila-hernandez', 'Miriam', 'Miriam', 'Águila Hernández', 'miriam.aguila@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '11137506', 'BUAP', psi_id, mediwork_id, 'Lic. en Psicología · Mtra. en Atención y Prevención de la Violencia', 'Encuentra tu armonía interna', 'Psicóloga con maestría en Atención y Prevención de la Violencia. Especialista en terapia familiar, trauma, duelo, ansiedad y depresión.', 'Puebla', 'Puebla', true),
  ('bethsabe-oyuki-flores-guerrero', 'Bethsabe Oyuki', 'Bethsabe Oyuki', 'Flores Guerrero', 'bethsabe.flores@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '12736745', 'BUAP', psi_id, mediwork_id, 'Lic. en Psicología · Terapia Individual, Pareja y Familiar', 'Un espacio seguro para tu bienestar', 'Especialista en terapia individual, de pareja, familiar y adicciones.', 'Puebla', 'Puebla', true),
  ('samantha-franco-mora', 'Samantha', 'Samantha', 'Franco Mora', 'samantha.franco@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '14545835', 'BUAP', psi_id, mediwork_id, 'Lic. en Psicología · Terapia Breve', 'Cambios efectivos en el menor tiempo posible', 'Especialista en Terapia Breve con enfoque en atención individual, de pareja y familiar.', 'Puebla', 'Puebla', true),
  ('jahanara-gutierrez-velez', 'Jahanara', 'Jahanara', 'Gutiérrez Velez', 'jahanara.gutierrez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '6571399', 'UDLAP', psi_id, mediwork_id, 'Lic. en Psicología · Atención a Adultos', 'Cada etapa de la vida adulta merece ser vivida con plenitud', 'Atención psicológica a adultos de 18 años en adelante.', 'Puebla', 'Puebla', true),
  ('nelida-jimenez-gomez-salazar', 'Nélida', 'Nélida', 'Jiménez Gomez Salazar', 'nelida.jimenez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '15176831', 'Universidad de Oriente', psi_id, mediwork_id, 'Lic. en Psicología · Niños y Adolescentes', 'Un espacio cálido y seguro para brillar desde adentro ✨', 'Especialista en bienestar emocional infantil y adolescente con enfoque cognitivo-conductual.', 'Puebla', 'Puebla', true),
  ('maria-del-rocio-mata-castillo', 'María del Rocío', 'María del Rocío', 'Mata Castillo', 'rocio.mata@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '15150132', 'Escuela Libre de Psicología', psi_id, mediwork_id, 'Lic. en Psicología', 'La salud mental se recorre mejor con acompañamiento profesional y humano', 'Atención psicológica profesional en Mediwork Centro Médico.', 'Puebla', 'Puebla', true),
  ('yenni-samantha-nieves-luis', 'Yenni Samantha', 'Yenni Samantha', 'Nieves Luis', 'yenni.nieves@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '09600531', 'BUAP', psi_id, mediwork_id, 'Lic. en Psicología · Psicoterapeuta Gestalt Humanista', 'Cada persona tiene la capacidad de sanar y crecer hacia una vida plena', 'Psicoterapeuta con Enfoque Gestalt Humanista y 14 años de experiencia clínica.', 'Puebla', 'Puebla', true)
  ON CONFLICT (slug) DO NOTHING;

  -- Odontología
  INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, activo) VALUES
  ('maria-graciela-balcazar-avila', 'Dra.', 'María Graciela', 'Balcazar Ávila', 'graciela.balcazar@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '0649868', odon_id, mediwork_id, 'Cirujano Dentista', 'Puebla', 'Puebla', true),
  ('angel-osante-hernandez', 'Dr.', 'Ángel', 'Osante Hernández', 'angel.osante@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '8431542', odon_id, mediwork_id, 'Odontología Integral, Cirugía Bucal e Implantología', 'Puebla', 'Puebla', true),
  ('leticia-olmos-garcia', 'Dra.', 'Leticia', 'Olmos García', 'leticia.olmos@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '12960735', odon_id, mediwork_id, 'Odontóloga General', 'Puebla', 'Puebla', true),
  ('maria-lucia-pineda-somodevilla', 'Dra.', 'María Lucía', 'Pineda Somodevilla', 'lucia.pineda@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '10302034', odon_id, mediwork_id, 'Odontopediatra', 'Puebla', 'Puebla', true),
  ('erika-ayonectili-quinones-mendoza', 'Dra.', 'Erika Ayonectili', 'Quiñones Mendoza', 'erika.quinones@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '5507644|14057865', odon_id, mediwork_id, 'Estomatóloga · Ortodoncista', 'Puebla', 'Puebla', true),
  ('ernesto-mendez-moyo', 'Dr.', 'Ernesto', 'Méndez Moyo', 'ernesto.mendez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '13062899', odon_id, mediwork_id, 'Rehabilitación Dental Funcional y Digital', 'Puebla', 'Puebla', true),
  ('luis-alberto-rodriguez-diaz', 'Dr.', 'Luis Alberto', 'Rodríguez Díaz', 'luis.rodriguez.diaz@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '9024081', odon_id, mediwork_id, 'Prótesis Bucal · Rehabilitación Oral · Implantología', 'Puebla', 'Puebla', true),
  ('ismael-torres-perez', 'Dr.', 'Ismael', 'Torres Pérez', 'ismael.torres@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '4565630', odon_id, mediwork_id, 'Rehabilitación Dental · Endodoncia · Periodoncia · Ortodoncia', 'Puebla', 'Puebla', true),
  ('karen-reynoso-hernandez', 'Dra.', 'Karen', 'Reynoso Hernández', 'karen.reynoso@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '12202629', odon_id, mediwork_id, 'Odontóloga', 'Puebla', 'Puebla', true),
  ('meritxell-hernandez-rosas', 'Dra.', 'Meritxell', 'Hernández Rosas', 'meritxell.hernandez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '14358364', odon_id, mediwork_id, 'Odontóloga General', 'Puebla', 'Puebla', true),
  ('lucina-gomez-cortes', 'Dra.', 'Lucina', 'Gómez Cortés', 'lucina.gomez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '3703672', odon_id, mediwork_id, 'Ortodoncista', 'Puebla', 'Puebla', true),
  ('daniel-dietter-ezquerra-mendizabal', 'Dr.', 'Daniel Dietter', 'Ezquerra Mendizabal', 'daniel.ezquerra@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '10705999', odon_id, mediwork_id, 'Cirujano Maxilofacial', 'Puebla', 'Puebla', true)
  ON CONFLICT (slug) DO NOTHING;

  -- Pediatría
  INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, cedula_especialidad, universidad, id_especialidad, centro_id, subespecialidad, frase_inspiradora, consultorio_ciudad, consultorio_estado, activo) VALUES
  ('gabriela-cardenas-ibarra', 'Dra.', 'Gabriela', 'Cárdenas Ibarra', 'gabriela.cardenas@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '5341554', '8693235', 'BUAP', ped_id, mediwork_id, 'Médico Cirujano — Pediatra · Onna Kids', 'Pediatría con ternura', 'Puebla', 'Puebla', true),
  ('tania-torres-sanchez', 'Dra.', 'Tania', 'Torres Sánchez', 'tania.torres@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '08790861', '12291732', 'BUAP', ped_id, mediwork_id, 'Médico Cirujano — Pediatra', NULL, 'Puebla', 'Puebla', true),
  ('diana-perla-valdez-acevedo', 'Dra.', 'Diana Perla', 'Valdez Acevedo', 'diana.valdez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '12053318', '14464782', 'BUAP', ped_id, mediwork_id, 'Médico Cirujano — Pediatra', NULL, 'Puebla', 'Puebla', true),
  ('rosa-nelida-perez-huerta', 'Dra.', 'Rosa Nélida', 'Pérez Huerta', 'rosa.perez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '4899002', '5928579', 'UNAM', ped_id, la_paz_id, 'Médico Cirujano — Neonatóloga', NULL, 'Puebla', 'Puebla', true),
  ('octavio-gamino-marquez', 'Dr.', 'Octavio', 'Gamiño Márquez', 'octavio.gamino@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '2853268', '4991193', 'UASLP', ped_id, la_paz_id, 'Médico Cirujano — Pediatra', NULL, 'Puebla', 'Puebla', true),
  ('alan-ramses-diaz-ulloa', 'Dr.', 'Alan Ramsés', 'Díaz Ulloa', 'alan.diaz@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '9187147', '15405769', 'UNAM', ped_id, la_paz_id, 'Médico Cirujano — Pediatra', NULL, 'Puebla', 'Puebla', true),
  ('patricia-dolores-diaz-jimenez', 'Dra.', 'Patricia Dolores', 'Díaz Jiménez', 'patricia.diaz@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '8376990', '11024610', 'BUAP', ped_id, la_paz_id, 'Médico Cirujano — Pediatra', NULL, 'Puebla', 'Puebla', true),
  ('karen-alba-hernandez', 'Dra.', 'Karen', 'Alba Hernández', 'karen.alba@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '11647942', '14839740', 'UAEM', ped_id, la_paz_id, 'Médico Cirujano — Pediatra', NULL, 'Puebla', 'Puebla', true)
  ON CONFLICT (slug) DO NOTHING;

  -- Cirugía General
  INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, activo) VALUES
  ('cesar-gamez-tellez', 'Dr.', 'César', 'Gámez Téllez', 'cesar.gamez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '11601619', cir_id, mediwork_id, 'Cirugía General y Laparoscópica', 'Puebla', 'Puebla', true),
  ('daniel-saucedo-conde', 'Dr.', 'Daniel', 'Saucedo Conde', 'daniel.saucedo@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '3663539|6249777|9476546', cir_id, mediwork_id, 'Cirugía General y Oncología Quirúrgica', 'Puebla', 'Puebla', true),
  ('sergio-navarro-leon', 'Dr.', 'Sergio', 'Navarro León', 'sergio.navarro@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '33445566', cir_id, mediwork_id, 'Cirujano General', 'Puebla', 'Puebla', true),
  ('oscar-genaro-olmos-garcia', 'Dr.', 'Oscar Genaro', 'Olmos García', 'oscar.olmos@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', 'POR DEFINIR', cir_id, mediwork_id, 'Cirugía General y Laparoscópica', 'Puebla', 'Puebla', true),
  ('gabriela-isabel-galeana-aburto', 'Dra.', 'Gabriela Isabel', 'Galeana Aburto', 'gabriela.galeana@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', 'POR DEFINIR', cir_id, mediwork_id, 'Cirugía General / Oncología', 'Puebla', 'Puebla', true)
  ON CONFLICT (slug) DO NOTHING;

  -- Geriatría
  INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, cedula_especialidad, universidad, id_especialidad, centro_id, consultorio_ciudad, consultorio_estado, activo) VALUES
  ('yaoliztli-garita-rosa', 'Dra.', 'Yaoliztli Elena', 'Garita Rosa', 'yaoliztli.garita@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '08733013', '14515265', 'UNAM', ger_id, mediwork_id, 'Puebla', 'Puebla', true),
  ('eloisa-guerrero-rodriguez', 'Dra.', 'Eloisa Estela', 'Guerrero Rodríguez', 'eloisa.guerrero@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '7880030', '13196755', 'BUAP', ger_id, mediwork_id, 'Puebla', 'Puebla', true),
  ('edivaldo-pereria-sandoval', 'Dr.', 'Edivaldo', 'Pereria Sandoval', 'edivaldo.pereria@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '11102430', '12352872', 'UPAEP', ger_id, mediwork_id, 'Puebla', 'Puebla', true),
  ('leny-alvarez-manzanilla', 'Dra.', 'Leny del Carmen', 'Álvarez Manzanilla', 'leny.alvarez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '3493417', '11546741', 'Univ. Juárez Autónoma de Tabasco', ger_id, mediwork_id, 'Puebla', 'Puebla', true),
  ('selene-calixto-tejeda', 'Dra.', 'Selene Yenuen', 'Calixto Tejeda', 'selene.calixto@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '2840658', '13197133', 'BUAP', ger_id, mediwork_id, 'Puebla', 'Puebla', true)
  ON CONFLICT (slug) DO NOTHING;

  -- Medicina Interna
  INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, cedula_especialidad, universidad, id_especialidad, centro_id, consultorio_ciudad, consultorio_estado, activo) VALUES
  ('yukiko-harumi-yamasaki-ramos', 'Dra.', 'Yukiko Harumi', 'Yamasaki Ramos', 'yukiko.yamasaki@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '11322344', '15243765', 'UNACH / BUAP', mi_id, mediwork_id, 'Puebla', 'Puebla', true),
  ('michelle-patricia-loeza-uribe', 'Dra.', 'Michelle Patricia', 'Loeza Uribe', 'michelle.loeza@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '10974202', '12939958', NULL, mi_id, mediwork_id, 'Puebla', 'Puebla', true)
  ON CONFLICT (slug) DO NOTHING;

  -- Nutrición
  INSERT INTO medicos (slug, titulo, nombre, apellido, email, password_hash, telefono, cedula_profesional, universidad, id_especialidad, centro_id, subespecialidad, consultorio_ciudad, consultorio_estado, activo) VALUES
  ('carmen-janet-bautista-orduno', 'LN.', 'Carmen Janet', 'Bautista Orduño', 'carmen.bautista@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', 'POR DEFINIR', NULL, nut_id, mediwork_id, 'Salud hormonal femenina y educadora en diabetes', 'Puebla', 'Puebla', true),
  ('monica-raquel-bonilla-castillo', 'LN.', 'Mónica Raquel', 'Bonilla Castillo', 'monica.bonilla@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', 'POR DEFINIR', 'UVM Campus Puebla', nut_id, mediwork_id, 'Nutrición Clínica', 'Puebla', 'Puebla', true),
  ('maria-fernanda-mateos-pastrana', 'LN.', 'María Fernanda', 'Mateos Pastrana', 'fernanda.mateos@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', 'POR DEFINIR', 'BUAP', nut_id, mediwork_id, 'Nutrióloga Clínica', 'Puebla', 'Puebla', true),
  ('maria-jose-mendiola-riestra', 'LN.', 'María José', 'Mendiola Riestra', 'maria.mendiola@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', 'POR DEFINIR', 'Universidad Iberoamericana Puebla', nut_id, mediwork_id, 'Nutrición Clínica', 'Puebla', 'Puebla', true),
  ('monica-rodriguez-benitez', 'LN.', 'Mónica', 'Rodríguez Benitez', 'monica.rodriguez@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', 'POR DEFINIR', 'BUAP', nut_id, mediwork_id, 'Nutrición Clínica', 'Puebla', 'Puebla', true),
  ('blanca-cristina-villalobos-flores', 'LN.', 'Blanca Cristina', 'Villalobos Flores', 'blanca.villalobos@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '13103131', 'BUAP', nut_id, mediwork_id, 'Nutrición Clínica', 'Puebla', 'Puebla', true),
  ('ana-paola-zarate-velazquez', 'LN.', 'Ana Paola', 'Zárate Velázquez', 'ana.zarate@directorio.mediprotect.com.mx', '$2a$10$x', '2228021933', '14440877', 'ISU Instituto Suizo', nut_id, mediwork_id, 'Nutrición Clínica', 'Puebla', 'Puebla', true)
  ON CONFLICT (slug) DO NOTHING;

END $$;
