export default defineEventHandler(async (event) => {
  try {
  const decoded = verifyToken(event)
  if (decoded.tipo !== 'medico') {
    throw createError({ statusCode: 403, message: 'Solo médicos pueden gestionar disponibilidad' })
  
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err?.message || 'Error interno del servidor' })
  }}

  const { id } = getRouterParams(event)
  const pool = await useDbPool(event)

  const result = await pool.query(
    `DELETE FROM disponibilidad_medico WHERE id = $1 AND id_medico = $2 RETURNING id`,
    [id, decoded.id]
  )
  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Disponibilidad no encontrada' })
  }
  return { mensaje: 'Disponibilidad eliminada' }
})
