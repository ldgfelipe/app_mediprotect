import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const { nombre, apellido, email, password, telefono, cedula_profesional, id_especialidad, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio } = await readBody(event)

  const pool = getPool()
  const existing = await pool.query('SELECT id FROM medicos WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    throw createError({ statusCode: 400, message: 'El email ya está registrado' })
  }

  const password_hash = await bcrypt.hash(password, 10)
  const result = await pool.query(
    `INSERT INTO medicos (nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, nombre, apellido, email, telefono, cedula_profesional, id_especialidad, created_at`,
    [nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio]
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
