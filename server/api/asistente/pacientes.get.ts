// GET - Asistente busca pacientes
export default defineEventHandler(async (event) => {
  const pool = useDbPool()
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

  const query = getQuery(event)
  const search = (query.search as string || '').trim()

  let sql = 'SELECT id, nombre, apellido, email, telefono, created_at FROM pacientes'
  const params = []

  if (search) {
    sql += ' WHERE nombre ILIKE $1 OR apellido ILIKE $1 OR email ILIKE $1 OR telefono ILIKE $1 OR id::text ILIKE $1'
    params.push('%' + search + '%')
  }

  sql += ' ORDER BY created_at DESC LIMIT 20'

  const result = await pool.query(sql, params)
  return { pacientes: result.rows }
})
