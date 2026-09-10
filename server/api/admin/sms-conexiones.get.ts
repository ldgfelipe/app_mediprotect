import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token invalido' }) }

  const pool = useDbPool(event)
  const result = await pool.query(
    'SELECT id, nombre, proveedor, account_sid, auth_token, api_url, metodo, from_number, modo, activa, preferida, prioridad, descripcion, created_at, updated_at FROM sms_conexiones ORDER BY prioridad ASC, created_at ASC'
  )

  return { conexiones: result.rows.map((c: any) => ({ ...c, auth_token: c.auth_token ? '********' : '' })) }
})
