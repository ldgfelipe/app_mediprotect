export default defineEventHandler(async (event) => {
  try {
  const decoded = verifyToken(event)
  if (decoded.tipo !== 'paciente') {
    throw createError({ statusCode: 403, message: 'Acceso solo para pacientes' })
  }

  const pool = await useDbPool(event)
  const result = await pool.query(
    `SELECT c.id, c.fecha_hora, c.estado, c.notas_paciente, c.created_at,
            c.id_medico,
            m.id as medico_id, m.nombre as medico_nombre, m.apellido as medico_apellido,
            m.foto_url as medico_foto, e.nombre as especialidad
     FROM citas c
     LEFT JOIN medicos m ON m.id = c.id_medico
     LEFT JOIN especialidades e ON e.id = m.id_especialidad
     WHERE c.id_paciente = $1
     ORDER BY c.fecha_hora DESC`, [decoded.id]
  )
  return { citas: result.rows }

  } catch (err: any) {
    throw createError({ statusCode: 500, message: err?.message || 'Error interno del servidor' })
  }
})