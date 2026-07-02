-- ============================================================
-- MIGRACIÓN: DIRECTORIO MÉDICO MEDIPROTECT
-- Homologa la tabla medicos con el directorio de mediprotect.com.mx
-- ============================================================

-- 1. EXTENDER especialidades
ALTER TABLE especialidades ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
ALTER TABLE especialidades ADD COLUMN IF NOT EXISTS icono VARCHAR(100) DEFAULT 'fa-solid fa-stethoscope';

UPDATE especialidades SET slug = 'medicina-general',       icono = 'fa-solid fa-stethoscope'      WHERE id = 1;
UPDATE especialidades SET slug = 'pediatria',              icono = 'fa-solid fa-children'         WHERE id = 2;
UPDATE especialidades SET slug = 'ginecologia',            icono = 'fa-solid fa-venus'            WHERE id = 3;
UPDATE especialidades SET slug = 'cardiologia',            icono = 'fa-solid fa-heart-pulse'      WHERE id = 4;
UPDATE especialidades SET slug = 'dermatologia',           icono = 'fa-solid fa-hand-dots'        WHERE id = 5;
UPDATE especialidades SET slug = 'ortopedia',              icono = 'fa-solid fa-bone'             WHERE id = 6;
UPDATE especialidades SET slug = 'oftalmologia',           icono = 'fa-solid fa-eye'              WHERE id = 7;
UPDATE especialidades SET slug = 'psicologia',             icono = 'fa-solid fa-brain'            WHERE id = 8;
UPDATE especialidades SET slug = 'nutricion',              icono = 'fa-solid fa-apple-whole'      WHERE id = 9;
UPDATE especialidades SET slug = 'odontologia',            icono = 'fa-solid fa-tooth'            WHERE id = 10;
UPDATE especialidades SET slug = 'medicina-interna',       icono = 'fa-solid fa-user-doctor'      WHERE id = 11;
UPDATE especialidades SET slug = 'neurologia',             icono = 'fa-solid fa-brain'            WHERE id = 12;
UPDATE especialidades SET slug = 'urologia',               icono = 'fa-solid fa-person'           WHERE id = 13;
UPDATE especialidades SET slug = 'traumatologia',          icono = 'fa-solid fa-bone'             WHERE id = 14;
UPDATE especialidades SET slug = 'neumologia',             icono = 'fa-solid fa-lungs'            WHERE id = 15;

INSERT INTO especialidades (nombre, slug, icono) VALUES
  ('Alergia e Inmunología',   'alergia-e-inmunologia',    'fa-solid fa-allergies'),
  ('Acupuntura',              'acupuntura',               'fa-solid fa-needle'),
  ('Bariatría',               'bariatria',                'fa-solid fa-weight-hanging'),
  ('Cirugía General',         'cirugia-general',          'fa-solid fa-user-md'),
  ('Cirugía Plástica',        'cirugia-plastica',         'fa-solid fa-syringe'),
  ('Coaching',                'coaching',                 'fa-solid fa-comments'),
  ('Cirugía Pediátrica',      'cirugia-pediatrica',       'fa-solid fa-baby'),
  ('Curación de Heridas',     'curacion-de-heridas',      'fa-solid fa-bandage'),
  ('Ecografía / Ultrasonido', 'ecografia-ultrasonido',    'fa-solid fa-wave-square'),
  ('Enfermería Obstétrica',   'enfermeria-obstetrica',    'fa-solid fa-user-nurse'),
  ('Fisioterapia',            'fisioterapia',             'fa-solid fa-person-walking'),
  ('Geriatría',               'geriatria',                'fa-solid fa-person-cane'),
  ('Medicina Estética',       'medicina-estetica',        'fa-solid fa-spa'),
  ('Medicina Familiar',       'medicina-familiar',        'fa-solid fa-house-medical'),
  ('Medicina Preventiva',     'medicina-preventiva',      'fa-solid fa-shield-virus'),
  ('Medicina de Rehabilitación','medicina-rehabilitacion','fa-solid fa-universal-access'),
  ('Medicina del Trabajo',    'medicina-del-trabajo',     'fa-solid fa-hard-hat'),
  ('Nefrología',              'nefrologia',               'fa-solid fa-droplet'),
  ('Neuropsicología',        'neuropsicologia',          'fa-solid fa-brain'),
  ('Oncología',               'oncologia',                'fa-solid fa-ribbon'),
  ('Psiquiatría',             'psiquiatria',              'fa-solid fa-pills'),
  ('Reumatología',            'reumatologia',             'fa-solid fa-bone'),
  ('Salud Auditiva',          'salud-auditiva',           'fa-solid fa-ear-listen')
ON CONFLICT (nombre) DO NOTHING;

-- 2. TABLA centros_medicos
CREATE TABLE IF NOT EXISTS centros_medicos (
  id          BIGSERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  direccion   TEXT,
  ciudad      TEXT DEFAULT 'Puebla',
  estado      TEXT DEFAULT 'Puebla',
  telefono    TEXT,
  activo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO centros_medicos (nombre, direccion, ciudad, estado) VALUES
  ('Mediwork Centro Médico', 'Por definir', 'Puebla', 'Puebla'),
  ('Hospital la Paz Puebla', 'Por definir', 'Puebla', 'Puebla')
ON CONFLICT DO NOTHING;

-- 3. EXTENDER medicos (solo columnas nuevas, las existentes se conservan)
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS slug         VARCHAR(255) UNIQUE;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS titulo       VARCHAR(20) DEFAULT 'Dr.';
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS subespecialidad TEXT;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS cedula_especialidad TEXT;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS universidad  TEXT;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS frase_inspiradora TEXT;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS whatsapp     VARCHAR(20) DEFAULT '522228021933';
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS precio_regular   DECIMAL(10,2);
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS precio_miembro   DECIMAL(10,2);
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS destacado    BOOLEAN DEFAULT false;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS centro_id    BIGINT REFERENCES centros_medicos(id);

-- Generar slugs para médicos existentes (TRANSLATE reemplaza UNACCENT)
UPDATE medicos SET slug = LOWER(REGEXP_REPLACE(
  TRANSLATE(nombre || '-' || apellido, 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'),
  '[^a-z0-9-]', '-', 'g'
)) WHERE slug IS NULL;

-- 4. TABLA servicios (tratamientos que ofrece cada médico)
CREATE TABLE IF NOT EXISTS servicios (
  id          BIGSERIAL PRIMARY KEY,
  medico_id   UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 5. TABLA precios_consulta (histórico de precios)
CREATE TABLE IF NOT EXISTS precios_consulta (
  id             BIGSERIAL PRIMARY KEY,
  medico_id      UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  precio_regular DECIMAL(10,2),
  precio_miembro DECIMAL(10,2),
  vigente_desde  DATE DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 6. TABLA medico_especialidades (M:N médicos ↔ especialidades)
CREATE TABLE IF NOT EXISTS medico_especialidades (
  id              BIGSERIAL PRIMARY KEY,
  medico_id       UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  especialidad_id BIGINT NOT NULL REFERENCES especialidades(id) ON DELETE CASCADE,
  UNIQUE(medico_id, especialidad_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_medicos_slug ON medicos(slug);
CREATE INDEX IF NOT EXISTS idx_medicos_activo ON medicos(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_servicios_medico ON servicios(medico_id);
CREATE INDEX IF NOT EXISTS idx_precios_medico ON precios_consulta(medico_id);
CREATE INDEX IF NOT EXISTS idx_medico_especialidades_medico ON medico_especialidades(medico_id);
