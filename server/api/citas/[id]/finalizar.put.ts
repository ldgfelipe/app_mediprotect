export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  if (decoded.tipo !== 'medico') {
    throw createError({ statusCode: 403, message: 'Solo médicos pueden finalizar citas' })
  }

  const { id } = getRouterParams(event)
  const { resultado } = await readBody(event)
  if (!['asistida', 'no_asistida'].includes(resultado)) {
    throw createError({ statusCode: 400, message: 'resultado debe ser asistida o no_asistida' })
  }

  const pool = useDbPool(event)

  const cita = await pool.query(
    'SELECT id, id_medico, estado FROM citas WHERE id = $1', [id]
  )
  if (cita.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Cita no encontrada' })
  }

  const c = cita.rows[0]
  if (c.id_medico !== decoded.id) {
    throw createError({ statusCode: 403, message: 'No autorizado' })
  }
  if (c.estado !== 'confirmada') {
    throw createError({ statusCode: 400, message: 'Solo se pueden finalizar citas confirmadas' })
  }

  await pool.query(
    'UPDATE citas SET estado = $1, resultado_triangulacion = $2, updated_at = NOW() WHERE id = $3',
    [resultado, resultado === 'asistida' ? 'coincide_asistio' : 'coincide_no_asistio', id]
  )
  return { mensaje: `Cita marcada como ${resultado}` }
})
