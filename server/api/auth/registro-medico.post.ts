import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

function generarSlug(nombre: string, apellido: string): string {
  return (nombre + '-' + apellido)
    .toLowerCase()
    .replace(/[áäàâ]/g, 'a').replace(/[éëèê]/g, 'e').replace(/[íïìî]/g, 'i')
    .replace(/[óöòô]/g, 'o').replace(/[úüùû]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export default defineEventHandler(async (event) => {
  const { nombre, apellido, email, password, telefono, cedula_profesional, id_especialidad, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio } = await readBody(event)

  const pool = getPool()
  const existing = await pool.query('SELECT id FROM medicos WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    throw createError({ statusCode: 400, message: 'El email ya está registrado' })
  }

  let slug = generarSlug(nombre, apellido)
  const slugExistente = await pool.query('SELECT id FROM medicos WHERE slug = $1', [slug])
  if (slugExistente.rows.length > 0) {
    slug = slug + '-' + Date.now().toString(36).slice(-4)
  }

  const password_hash = await bcrypt.hash(password, 10)
  const result = await pool.query(
    `INSERT INTO medicos (nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio, slug)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id, nombre, apellido, email, telefono, cedula_profesional, id_especialidad, slug, created_at`,
    [nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio, slug]
  )

  const medico = result.rows[0]
  const token = jwt.sign(
    { id: medico.id, email: medico.email, tipo: 'medico' },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  setResponseStatus(event, 201)
  return { usuario: medico, token }
})
