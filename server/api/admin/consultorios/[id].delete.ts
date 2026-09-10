import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin_token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const { id } = getRouterParams(event)
  const pool = useDbPool(event)
  const result = await pool.query('DELETE FROM consultorios WHERE id = $1 RETURNING id', [id])

  if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'Consultorio no encontrado' })
  return { success: true }
})
