export default defineEventHandler(async (event) => {
  try {
  const decoded = verifyToken(event)
  const { id } = getRouterParams(event)
  const pool = await useDbPool(event)

  const cita = await pool.query(
    'SELECT id, id_paciente, id_medico, estado FROM citas WHERE id = $1', [id]
  )
  if (cita.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Cita no encontrada' })
  }

  const c = cita.rows[0]
  const esPaciente = decoded.tipo === 'paciente' && c.id_paciente === decoded.id
  const esMedico = decoded.tipo === 'medico' && c.id_medico === decoded.id
  if (!esPaciente && !esMedico) {
    throw createError({ statusCode: 403, message: 'No autorizado para cancelar esta cita' })
  }

  if (!['pendiente', 'confirmada', 'reagendada'].includes(c.estado)) {
    throw createError({ statusCode: 400, message: `No se puede cancelar una cita en estado ${c.estado}` })
  }

  await pool.query('UPDATE citas SET estado = $1, updated_at = NOW() WHERE id = $2', ['cancelada', id])
  return { mensaje: 'Cita cancelada exitosamente' }

  } catch (err: any) {
    throw createError({ statusCode: 500, message: err?.message || 'Error interno del servidor' })
  }
})