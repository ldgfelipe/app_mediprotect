export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  if (decoded.tipo !== 'medico') {
    throw createError({ statusCode: 403, message: 'Solo médicos pueden gestionar disponibilidad' })
  }

  const { id } = getRouterParams(event)
  const pool = getPool()

  const result = await pool.query(
    `DELETE FROM disponibilidad_medico WHERE id = $1 AND id_medico = $2 RETURNING id`,
    [id, decoded.id]
  )
  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Disponibilidad no encontrada' })
  }
  return { mensaje: 'Disponibilidad eliminada' }
})
