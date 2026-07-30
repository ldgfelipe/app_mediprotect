import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'default_secret') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { nombre, apellido, email, telefono, fecha_nacimiento, genero, ciudad, password } = body

  const pool = getPool()

  const existing = await pool.query('SELECT id FROM pacientes WHERE id = $1', [id])
  if (existing.rowCount === 0) {
    throw createError({ statusCode: 404, message: 'Paciente no encontrado' })
  }

  if (email) {
    const dup = await pool.query('SELECT id FROM pacientes WHERE email = $1 AND id != $2', [email, id])
    if (dup.rowCount > 0) {
      throw createError({ statusCode: 400, message: 'Ya existe otro paciente con ese email' })
    }
  }

  let passwordHash = null
  if (password && password.trim()) {
    passwordHash = await bcrypt.hash(password, 10)
  }

  const sets = []
  const params = []
  let idx = 1

  if (nombre !== undefined) { sets.push(`nombre = $${idx++}`); params.push(nombre) }
  if (apellido !== undefined) { sets.push(`apellido = $${idx++}`); params.push(apellido) }
  if (email !== undefined) { sets.push(`email = $${idx++}`); params.push(email) }
  if (telefono !== undefined) { sets.push(`telefono = $${idx++}`); params.push(telefono) }
  if (fecha_nacimiento !== undefined) { sets.push(`fecha_nacimiento = $${idx++}`); params.push(fecha_nacimiento || null) }
  if (genero !== undefined) { sets.push(`genero = $${idx++}`); params.push(genero || null) }
  if (ciudad !== undefined) { sets.push(`ciudad = $${idx++}`); params.push(ciudad || null) }
  if (passwordHash) { sets.push(`password_hash = $${idx++}`); params.push(passwordHash) }

  if (sets.length === 0) {
    throw createError({ statusCode: 400, message: 'No hay datos para actualizar' })
  }

  params.push(id)
  const result = await pool.query(
    `UPDATE pacientes SET ${sets.join(', ')} WHERE id = $${idx}
     RETURNING id, nombre, apellido, email, telefono, created_at`,
    params
  )

  return { success: true, paciente: result.rows[0] }
})
