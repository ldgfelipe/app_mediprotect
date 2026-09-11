
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const { id } = getRouterParams(event)
  const pool = useDbPool(event)
  const result = await pool.query('DELETE FROM consultorios WHERE id = $1 RETURNING id', [id])

  if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'Consultorio no encontrado' })
  return { success: true }
})
