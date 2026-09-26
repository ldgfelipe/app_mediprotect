-- ============================================================
-- MediProtect - Flujo de asistencia post-cita
-- (recordatorio proactivo + respuesta del paciente)
-- ============================================================
-- Nota sobre nombres: el modelo real de la tabla `citas` ya usa
--   fecha_hora           (en vez de fecha_hora_cita)
--   recordatorio_24h_enviado (recordatorio previo a la cita)
-- por lo que aquí se agregan columnas dedicadas al flujo de
-- asistencia para no mezclar semánticas.
-- ============================================================

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS respuesta_paciente_asistio varchar(10),
  ADD COLUMN IF NOT EXISTS recordatorio_asistencia_enviado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN citas.respuesta_paciente_asistio IS
  'Respuesta del paciente al recordatorio post-cita: si | no';
COMMENT ON COLUMN citas.recordatorio_asistencia_enviado IS
  'true cuando ya se envio el recordatorio de asistencia (3h despues de la cita)';

CREATE INDEX IF NOT EXISTS idx_citas_recordatorio_asistencia
  ON citas (fecha_hora)
  WHERE recordatorio_asistencia_enviado = false;
