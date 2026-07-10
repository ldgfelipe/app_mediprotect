import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getPool } from '#server/utils/db'

export default defineEventHandler(async (event) => {
  const { nombre, apellido, email, password, telefono, fecha_nacimiento, genero, direccion, id_paquete } = await readBody(event)

  const pool = getPool()
  const existing = await pool.query('SELECT id FROM pacientes WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    throw createError({ statusCode: 400, message: 'El email ya está registrado' })
  }

  const password_hash = await bcrypt.hash(password, 10)
  const result = await pool.query(
    `INSERT INTO pacientes (nombre, apellido, email, password_hash, telefono, fecha_nacimiento, genero, direccion)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, nombre, apellido, email, telefono, created_at`,
    [nombre, apellido, email, password_hash, telefono, fecha_nacimiento, genero, direccion]
  )

  const paciente = result.rows[0]

  // Assign package if provided
  if (id_paquete) {
    await pool.query(
      `INSERT INTO paciente_paquete (id_paciente, id_paquete, fecha_inicio, estado)
       VALUES ($1, $2, NOW(), 'activo')`,
      [paciente.id, id_paquete]
    )
  } else {
    // Default to Básico
    const basico = await pool.query("SELECT id FROM paquetes WHERE slug = 'basico' AND activo = true LIMIT 1")
    if (basico.rows.length > 0) {
      await pool.query(
        `INSERT INTO paciente_paquete (id_paciente, id_paquete, fecha_inicio, estado)
         VALUES ($1, $2, NOW(), 'activo')`,
        [paciente.id, basico.rows[0].id]
      )
    }
  }

  const token = jwt.sign(
    { id: paciente.id, email: paciente.email, tipo: 'paciente' },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  setResponseStatus(event, 201)
  return { usuario: paciente, token }
})
