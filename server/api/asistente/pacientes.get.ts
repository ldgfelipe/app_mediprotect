import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
})

// GET - Asistente busca pacientes
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user
  try {
    const jwt = await import('jsonwebtoken')
    user = jwt.default.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  if (user.tipo !== 'asistente' && user.tipo !== 'admin') {
    throw createError({ statusCode: 403, message: 'No autorizado' })
  }

  const query = getQuery(event)
  const search = (query.search as string || '').trim()

  let sql = 'SELECT id, nombre, apellido, email, telefono, created_at FROM pacientes'
  const params = []

  if (search) {
    sql += ' WHERE nombre ILIKE $1 OR apellido ILIKE $1 OR email ILIKE $1 OR telefono ILIKE $1'
    params.push('%' + search + '%')
  }

  sql += ' ORDER BY created_at DESC LIMIT 20'

  const result = await pool.query(sql, params)
  return { pacientes: result.rows }
})
