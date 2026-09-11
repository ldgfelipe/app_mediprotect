export default defineEventHandler(async (event) => {
  const _user = verifyAdminOrAsistenteToken(event)

  const pool = useDbPool(event)
  const { id } = getRouterParams(event)

  const medico = await pool.query(
    `SELECT m.*, e.nombre as especialidad_nombre
     FROM medicos m
     LEFT JOIN especialidades e ON e.id = m.id_especialidad
     WHERE m.id = $1`,
    [id]
  )
  if (medico.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Médico no encontrado' })
  }

  const citas = await pool.query(
    `SELECT c.id, c.fecha_hora, c.estado, c.created_at, c.notas_paciente, c.notas_asistente,
            CONCAT(p.nombre, ' ', p.apellido) as paciente_nombre,
            p.telefono as paciente_telefono, p.email as paciente_email
     FROM citas c
     LEFT JOIN pacientes p ON c.id_paciente = p.id
     WHERE c.id_medico = $1
     ORDER BY c.fecha_hora DESC NULLS LAST`,
    [id]
  )

  const stats = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
       COUNT(*) FILTER (WHERE estado = 'confirmada') as confirmadas,
       COUNT(*) FILTER (WHERE estado IN ('paciente_llego','en_atencion')) as en_curso,
       COUNT(*) FILTER (WHERE estado = 'asistida') as asistidas,
       COUNT(*) FILTER (WHERE estado = 'cancelada') as canceladas,
       COUNT(*) FILTER (WHERE estado = 'no_asistida') as no_asistidas,
       COUNT(*) FILTER (WHERE fecha_hora >= NOW() AND estado IN ('pendiente','confirmada')) as proximas
     FROM citas WHERE id_medico = $1`,
    [id]
  )

  return {
    medico: medico.rows[0],
    citas: citas.rows,
    estadisticas: stats.rows[0]
  }
})
