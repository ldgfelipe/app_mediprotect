import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email y contraseña son requeridos' })
  }

  const result = await pool.query(
    'SELECT id, nombre, apellido, email, telefono, activo, permisos FROM asistentes WHERE email = $1',
    [email]
  )

  if (result.rows.length === 0) {
    throw createError({ statusCode: 401, message: 'Credenciales incorrectas' })
  }

  const asistente = result.rows[0]

  if (!asistente.activo) {
    throw createError({ statusCode: 403, message: 'Cuenta desactivada. Contacta al administrador.' })
  }

  const validPassword = await bcrypt.compare(password, await pool.query('SELECT password_hash FROM asistentes WHERE id = $1', [asistente.id]).then(r => r.rows[0]?.password_hash))
  if (!validPassword) {
    throw createError({ statusCode: 401, message: 'Credenciales incorrectas' })
  }

  const token = jwt.sign(
    { id: asistente.id, email: asistente.email, tipo: 'asistente', permisos: asistente.permisos },
    process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026',
    { expiresIn: '12h' }
  )

  return {
    token,
    asistente: {
      id: asistente.id,
      nombre: asistente.nombre,
      apellido: asistente.apellido,
      email: asistente.email,
      telefono: asistente.telefono,
      permisos: asistente.permisos,
    }
  }
})
