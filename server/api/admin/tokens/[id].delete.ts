import jwt from 'jsonwebtoken'

function verifyAdmin(event: any) {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }
}

export default defineEventHandler(async (event) => {
  verifyAdmin(event)
  const pool = useDbPool(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  await pool.query('DELETE FROM api_tokens WHERE id = $1', [id])
  return { ok: true }
})