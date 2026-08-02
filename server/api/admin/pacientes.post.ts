import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const body = await readBody(event)
  const { nombre, apellido, email, password, telefono, fecha_nacimiento, genero, ciudad, curp, id_empresa } = body

  if (!nombre || !email) {
    throw createError({ statusCode: 400, message: 'Nombre y email son requeridos' })
  }

  const pool = getPool()

  const existing = await pool.query('SELECT id FROM pacientes WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    throw createError({ statusCode: 400, message: 'El email ya está registrado' })
  }

  const password_hash = await bcrypt.hash(password || 'mediprotect123', 10)

  const result = await pool.query(`
    INSERT INTO pacientes (nombre, apellido, email, password_hash, telefono, fecha_nacimiento, genero, ciudad, curp)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING id, nombre, apellido, email, telefono, created_at
  `, [
    nombre, apellido || null, email, password_hash,
    telefono || null, fecha_nacimiento || null, genero || null,
    ciudad || null, curp || null
  ])

  const paciente = result.rows[0]

  if (id_empresa) {
    try {
      await pool.query(
        'INSERT INTO empresa_pacientes (id_empresa, id_paciente) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id_empresa, paciente.id]
      )
    } catch {}
  }

  setResponseStatus(event, 201)
  return { paciente }
})
