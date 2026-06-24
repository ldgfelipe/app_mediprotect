import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'default_secret') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const pool = getPool()
  const result = await pool.query('SELECT id, nombre, apellido, email, telefono, created_at FROM pacientes ORDER BY created_at DESC')
  return { pacientes: result.rows }
})
