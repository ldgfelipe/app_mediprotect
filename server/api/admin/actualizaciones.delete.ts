import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token invalido' }) }

  const query = getQuery(event)
  const id = query.id
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const pool = useDbPool(event)
  const result = await pool.query('DELETE FROM actualizaciones_sistema WHERE id = $1', [id])
  if (result.rowCount === 0) throw createError({ statusCode: 404, message: 'No encontrada' })

  return { success: true }
})
