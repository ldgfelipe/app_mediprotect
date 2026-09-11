
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const query = getQuery(event)
  const id = query.id
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const pool = useDbPool(event)
  const result = await pool.query('DELETE FROM tareas_pendientes WHERE id = $1', [id])
  if (result.rowCount === 0) throw createError({ statusCode: 404, message: 'No encontrada' })

  return { success: true }
})
