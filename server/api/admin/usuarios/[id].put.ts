import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const _user = verifyAdminToken(event)

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const { nombre, email, password, id_rol, activo } = body

  const pool = await useDbPool(event)

  let passwordHash = null
  if (password) {
    passwordHash = await bcrypt.hash(password, 10)
  }

  const result = await pool.query(
    `UPDATE usuarios_sistema SET
       nombre = COALESCE($1, nombre),
       email = COALESCE($2, email),
       password_hash = COALESCE($3, password_hash),
       id_rol = COALESCE($4, id_rol),
       activo = COALESCE($5, activo)
     WHERE id = $6
     RETURNING id, nombre, email, id_rol, activo, created_at`,
    [nombre || null, email || null, passwordHash, id_rol || null, activo, id]
  )

  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Usuario no encontrado' })
  }

  return { usuario: result.rows[0] }
})
