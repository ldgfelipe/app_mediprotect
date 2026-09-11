
export default defineEventHandler(async (event) => {
  const _user = verifyAdminToken(event)
  const pool = useDbPool(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  await pool.query('DELETE FROM api_tokens WHERE id = $1', [id])
  return { ok: true }
})