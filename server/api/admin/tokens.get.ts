import jwt from 'jsonwebtoken'

function verifyAdmin(event: any) {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }
}

export default defineEventHandler(async (event) => {
  verifyAdmin(event)
  const pool = getPool()
  const result = await pool.query(
    'SELECT id, nombre, token_preview, permisos, activo, ultimo_uso, created_at FROM api_tokens ORDER BY created_at DESC'
  )
  return { tokens: result.rows }
})