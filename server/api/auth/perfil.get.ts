import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  let decoded: any
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'default_secret')
  } catch {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  const pool = getPool()
  const { id, tipo } = decoded

  if (tipo === 'medico') {
    const result = await pool.query(
      `SELECT m.*, e.nombre as especialidad FROM medicos m
       LEFT JOIN especialidades e ON m.id_especialidad = e.id WHERE m.id = $1`, [id]
    )
    if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'No encontrado' })
    return { usuario: result.rows[0] }
  }

  const result = await pool.query(
    'SELECT id, nombre, apellido, email, telefono, fecha_nacimiento, genero, direccion, created_at FROM pacientes WHERE id = $1', [id]
  )
  if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'No encontrado' })
  return { usuario: result.rows[0] }
})
