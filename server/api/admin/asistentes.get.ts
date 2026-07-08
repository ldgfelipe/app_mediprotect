import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
})

// GET - List all assistants (admin only)
export default defineEventHandler(async (event) => {
  const auth = getCookie(event, 'admin_token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!auth) throw createError({ statusCode: 401, message: 'No autorizado' })

  const result = await pool.query(
    'SELECT id, nombre, apellido, email, telefono, activo, permisos, created_at FROM asistentes ORDER BY created_at DESC'
  )

  return { asistentes: result.rows }
})
