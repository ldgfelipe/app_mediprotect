
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const pool = await useDbPool(event)

  const result = await pool.query(
    'UPDATE pagos SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [body.estado, id]
  )
  if (!result.rows.length) throw createError({ statusCode: 404, message: 'Pago no encontrado' })
  return { pago: result.rows[0] }
})
