
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const query = getQuery(event)
  const id = query.id

  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const pool = await useDbPool(event)
  const result = await pool.query('DELETE FROM telefonos_verificados WHERE id = $1', [id])

  if (result.rowCount === 0) {
    throw createError({ statusCode: 404, message: 'Telefono no encontrado' })
  }

  return { success: true, mensaje: 'Telefono eliminado de la lista verificada' }
})
