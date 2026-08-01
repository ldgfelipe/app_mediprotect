import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'default_secret') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const pool = getPool()

  const result = await pool.query(
    'UPDATE pagos SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [body.estado, id]
  )
  if (!result.rows.length) throw createError({ statusCode: 404, message: 'Pago no encontrado' })
  return { pago: result.rows[0] }
})
