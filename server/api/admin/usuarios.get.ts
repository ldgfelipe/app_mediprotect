import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const pool = useDbPool(event)

  const result = await pool.query(
    `SELECT u.id, u.nombre, u.email, u.id_rol, u.activo, u.created_at, r.nombre as rol_nombre
     FROM usuarios_sistema u
     LEFT JOIN roles r ON r.id = u.id_rol
     ORDER BY u.created_at DESC`
  )

  return { usuarios: result.rows }
})
