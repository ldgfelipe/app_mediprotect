import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'default_secret') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const pool = getPool()
  const result = await pool.query(`
    SELECT c.id, c.fecha_hora, c.estado, c.created_at,
           CONCAT(p.nombre, ' ', p.apellido) as paciente_nombre,
           CONCAT(m.nombre, ' ', m.apellido) as medico_nombre
    FROM citas c
    LEFT JOIN pacientes p ON c.id_paciente = p.id
    LEFT JOIN medicos m ON c.id_medico = m.id
    ORDER BY c.fecha_hora DESC
  `)
  return { citas: result.rows }
})
