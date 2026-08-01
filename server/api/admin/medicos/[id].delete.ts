import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const pool = getPool()
  const id = getRouterParam(event, 'id')

  const existing = await pool.query('SELECT id FROM medicos WHERE id = $1', [id])
  if (existing.rowCount === 0) {
    throw createError({ statusCode: 404, message: 'Médico no encontrado' })
  }

  await pool.query('UPDATE medicos SET activo = false WHERE id = $1', [id])

  return { success: true, message: 'Médico desactivado exitosamente' }
})