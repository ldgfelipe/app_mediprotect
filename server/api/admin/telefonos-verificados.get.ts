import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token invalido' }) }

  const pool = useDbPool()
  const result = await pool.query(
    'SELECT id, telefono, descripcion, verificado_por, created_at FROM telefonos_verificados ORDER BY created_at DESC'
  )

  return { telefonos: result.rows }
})
