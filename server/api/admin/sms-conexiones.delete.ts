import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token invalido' }) }

  const body = await readBody(event)
  const { id } = body
  if (!id) throw createError({ statusCode: 400, message: 'El id es requerido' })

  const pool = getPool()
  const result = await pool.query('DELETE FROM sms_conexiones WHERE id = $1 RETURNING id, nombre', [id])
  if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'Conexion no encontrada' })

  return { success: true, eliminada: result.rows[0] }
})
