// GET - Asistente busca pacientes
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

  const query = getQuery(event)
  const search = (query.search as string || '').trim()

  console.log('[AsistentePacientes] Search:', JSON.stringify(search))

  if (!search) {
    const result = await pool.query('SELECT id, nombre, apellido, email, telefono, created_at FROM pacientes ORDER BY created_at DESC LIMIT 50')
    return { pacientes: result.rows }
  }

  const searchLower = search.toLowerCase()

  const sql = `SELECT id, nombre, apellido, email, telefono, created_at FROM pacientes
    WHERE LOWER(nombre) LIKE $1
    OR LOWER(apellido) LIKE $1
    OR LOWER(email) LIKE $1
    OR telefono LIKE $2
    OR LOWER(nombre || ' ' || COALESCE(apellido, '')) LIKE $1
    OR id::text = $3
    ORDER BY created_at DESC LIMIT 20`

  const params = [
    '%' + searchLower + '%',
    '%' + search.replace(/[^0-9]/g, '') + '%',
    search
  ]

  console.log('[AsistentePacientes] SQL:', sql, 'params:', params)

  const result = await pool.query(sql, params)
  console.log('[AsistentePacientes] Results:', result.rows.length)

  return { pacientes: result.rows }
})
