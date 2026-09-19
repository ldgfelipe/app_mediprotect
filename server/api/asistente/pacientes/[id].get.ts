// GET - Buscar paciente por ID directo
export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user
  try {
    const jwt = await import('jsonwebtoken')
    user = jwt.default.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  if (user.tipo?.toLowerCase() !== 'asistente' && user.tipo?.toLowerCase() !== 'admin') {
    throw createError({ statusCode: 403, message: 'No autorizado' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const result = await pool.query(
    'SELECT id, nombre, apellido, email, telefono, created_at FROM pacientes WHERE id::text = $1',
    [id]
  )

  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Paciente no encontrado con ID: ' + id })
  }

  return { paciente: result.rows[0] }
})
