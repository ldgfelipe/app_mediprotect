export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  if (decoded.tipo !== 'medico') {
    throw createError({ statusCode: 403, message: 'Solo médicos pueden confirmar citas' })
  }

  const { id } = getRouterParams(event)
  const pool = useDbPool(event)

  const cita = await pool.query(
    'SELECT id, id_medico, estado FROM citas WHERE id = $1', [id]
  )
  if (cita.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Cita no encontrada' })
  }

  const c = cita.rows[0]
  if (c.id_medico !== decoded.id) {
    throw createError({ statusCode: 403, message: 'No autorizado para confirmar esta cita' })
  }
  if (c.estado !== 'pendiente') {
    throw createError({ statusCode: 400, message: 'Solo se pueden confirmar citas pendientes' })
  }

  await pool.query('UPDATE citas SET estado = $1, updated_at = NOW() WHERE id = $2', ['confirmada', id])
  return { mensaje: 'Cita confirmada exitosamente' }
})
