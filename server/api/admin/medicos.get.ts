import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'default_secret') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const pool = getPool()
  const result = await pool.query(`
    SELECT m.id, m.nombre, m.apellido, m.email, m.telefono, m.cedula_profesional, e.nombre as especialidad, m.activo, m.created_at
    FROM medicos m LEFT JOIN especialidades e ON m.id_especialidad = e.id
    ORDER BY m.created_at DESC
  `)
  return { medicos: result.rows }
})
