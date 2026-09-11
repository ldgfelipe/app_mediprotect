import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const _user = verifyAdminToken(event)

  const body = await readBody(event)
  const { nombre, email, password, id_rol } = body

  if (!nombre || !email || !password || !id_rol) {
    throw createError({ statusCode: 400, message: 'Nombre, email, contraseña y rol son requeridos' })
  }

  const pool = await useDbPool(event)

  const existing = await pool.query('SELECT id FROM usuarios_sistema WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    throw createError({ statusCode: 409, message: 'Ya existe un usuario con ese email' })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const result = await pool.query(
    `INSERT INTO usuarios_sistema (nombre, email, password_hash, id_rol, activo)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, nombre, email, id_rol, activo, created_at`,
    [nombre, email, passwordHash, id_rol]
  )

  return { usuario: result.rows[0] }
})
