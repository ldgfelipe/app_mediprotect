-- ============================================
-- SEED: Planes de produccion para BASE DE TEST
-- ============================================

-- Limpiar planes existentes (opcional, descomentar si quieres reemplazar)
-- DELETE FROM paquete_beneficios;
-- DELETE FROM paquetes;

-- PLAN 1: Basico
INSERT INTO paquetes (id, nombre, slug, precio, descripcion, activo)
VALUES (1, 'Basico', 'basico', 0.00, 'Afiliacion gratuita con descuentos basicos', true)
ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, slug=EXCLUDED.slug, precio=EXCLUDED.precio, descripcion=EXCLUDED.descripcion;

-- PLAN 2: Esencial
INSERT INTO paquetes (id, nombre, slug, precio, descripcion, activo)
VALUES (2, 'Esencial', 'esencial', 1399.00, 'El plan mas popular con seguro incluido', true)
ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, slug=EXCLUDED.slug, precio=EXCLUDED.precio, descripcion=EXCLUDED.descripcion;

-- PLAN 3: Integral
INSERT INTO paquetes (id, nombre, slug, precio, descripcion, activo)
VALUES (3, 'Integral', 'integral', 2499.00, 'Cobertura completa y mayores descuentos', true)
ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, slug=EXCLUDED.slug, precio=EXCLUDED.precio, descripcion=EXCLUDED.descripcion;

-- PLAN 4: Elite
INSERT INTO paquetes (id, nombre, slug, precio, descripcion, activo)
VALUES (4, 'Elite', 'elite', 3699.00, 'Premium con la maxima proteccion', true)
ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, slug=EXCLUDED.slug, precio=EXCLUDED.precio, descripcion=EXCLUDED.descripcion;

-- ============================================
-- BENEFICIOS
-- ============================================

-- Beneficios Basico (id=1)
DELETE FROM paquete_beneficios WHERE id_paquete = 1;
INSERT INTO paquete_beneficios (id_paquete, beneficio, valor, tipo, orden) VALUES
(1, 'Consultas con especialistas', 'Incluido', 'check', 1),
(1, 'Descuentos en estudios de laboratorio', 'Incluido', 'check', 2),
(1, 'Estudio Quimica Sanguinea', 'No incluido', 'cross', 3),
(1, 'Descuentos en servicios hospitalarios', 'Incluido', 'check', 4),
(1, 'Descuentos en ambulancias', '5%', 'texto', 5),
(1, 'Descuentos en hemodialisis e infusiones IV', '5%', 'texto', 6),
(1, 'Seguro muerte accidental (12-70 anios)', 'No incluido', 'cross', 7),
(1, 'Gastos funerarios por accidente (0-70 anios)', 'No incluido', 'cross', 8),
(1, 'Reembolso gastos medicos por accidente (0-70 anios)', 'No incluido', 'cross', 9),
(1, 'Perdida de miembros Escala B (0-70 anios)', 'No incluido', 'cross', 10);

-- Beneficios Esencial (id=2)
DELETE FROM paquete_beneficios WHERE id_paquete = 2;
INSERT INTO paquete_beneficios (id_paquete, beneficio, valor, tipo, orden) VALUES
(2, 'Consultas con especialistas', 'Incluido', 'check', 1),
(2, 'Descuentos en estudios de laboratorio', 'Incluido', 'check', 2),
(2, 'Estudio Quimica Sanguinea', '6 elementos', 'texto', 3),
(2, 'Descuentos en servicios hospitalarios', 'Incluido', 'check', 4),
(2, 'Descuentos en ambulancias', '5%', 'texto', 5),
(2, 'Descuentos en hemodialisis e infusiones IV', '5%', 'texto', 6),
(2, 'Seguro muerte accidental (12-70 anios)', '$110,000', 'texto', 7),
(2, 'Gastos funerarios por accidente (0-70 anios)', '$30,000', 'texto', 8),
(2, 'Reembolso gastos medicos por accidente (0-70 anios)', '$20,000', 'texto', 9),
(2, 'Perdida de miembros Escala B (0-70 anios)', '$30,000', 'texto', 10);

-- Beneficios Integral (id=3)
DELETE FROM paquete_beneficios WHERE id_paquete = 3;
INSERT INTO paquete_beneficios (id_paquete, beneficio, valor, tipo, orden) VALUES
(3, 'Consultas con especialistas', 'Incluido', 'check', 1),
(3, 'Descuentos en estudios de laboratorio', 'Incluido', 'check', 2),
(3, 'Estudio Quimica Sanguinea', '24 elementos', 'texto', 3),
(3, 'Descuentos en servicios hospitalarios', 'Incluido', 'check', 4),
(3, 'Descuentos en ambulancias', '10%', 'texto', 5),
(3, 'Descuentos en hemodialisis e infusiones IV', '10%', 'texto', 6),
(3, 'Seguro muerte accidental (12-70 anios)', '$200,000', 'texto', 7),
(3, 'Gastos funerarios por accidente (0-70 anios)', '$30,000', 'texto', 8),
(3, 'Reembolso gastos medicos por accidente (0-70 anios)', '$20,000', 'texto', 9),
(3, 'Perdida de miembros Escala B (0-70 anios)', '$30,000', 'texto', 10);

-- Beneficios Elite (id=4)
DELETE FROM paquete_beneficios WHERE id_paquete = 4;
INSERT INTO paquete_beneficios (id_paquete, beneficio, valor, tipo, orden) VALUES
(4, 'Consultas con especialistas', 'Incluido', 'check', 1),
(4, 'Descuentos en estudios de laboratorio', 'Incluido', 'check', 2),
(4, 'Estudio Quimica Sanguinea', '24 elementos', 'texto', 3),
(4, 'Descuentos en servicios hospitalarios', 'Incluido', 'check', 4),
(4, 'Descuentos en ambulancias', '15%', 'texto', 5),
(4, 'Descuentos en hemodialisis e infusiones IV', '15%', 'texto', 6),
(4, 'Seguro muerte accidental (12-70 anios)', '$500,000', 'texto', 7),
(4, 'Gastos funerarios por accidente (0-70 anios)', 'No incluido', 'cross', 8),
(4, 'Reembolso gastos medicos por accidente (0-70 anios)', '$50,000', 'texto', 9),
(4, 'Perdida de miembros Escala B (0-70 anios)', '$200,000', 'texto', 10);
