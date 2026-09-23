-- ============================================================
-- MIGRACION 005 - Disponibilidad medica real (horarios)
-- Agrega a medicos: dias de atencion y rangos horarios reales
-- (matutino y vespertino) para refactor de disponibilidad WhatsApp.
-- Ejecutar en PRODUCCION y TEST.
-- ============================================================

ALTER TABLE medicos ADD COLUMN IF NOT EXISTS dias_disponibles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS horario_inicio TIME;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS horario_fin TIME;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS horario_inicio_vespertino TIME;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS horario_fin_vespertino TIME;

-- Backfill desde disponibilidad_medico (si existe data) para no romper
-- disponibilidad actual al momento de aplicar la migracion.
UPDATE medicos m
SET dias_disponibles = sub.dias,
    horario_inicio = sub.inicio,
    horario_fin = sub.fin
FROM (
  SELECT id_medico,
         jsonb_agg(DISTINCT dia_semana ORDER BY dia_semana)::jsonb AS dias,
         MIN(hora_inicio)::time AS inicio,
         MAX(hora_fin)::time AS fin
  FROM disponibilidad_medico
  WHERE activo = true
  GROUP BY id_medico
) sub
WHERE m.id = sub.id_medico;

-- Indice de apoyo para consultas de citas por medico y dia
CREATE INDEX IF NOT EXISTS idx_citas_medico_dia ON citas (id_medico, fecha_hora);