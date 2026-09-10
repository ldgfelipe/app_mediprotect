import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const pool = useDbPool(event)

  const { nombre, rfc, email, telefono, contacto_nombre, direccion, ciudad, estado, activo, google_maps_url } = body

  const result = await pool.query(`
    UPDATE empresas SET
      nombre = COALESCE($1, nombre),
      rfc = COALESCE($2, rfc),
      email = COALESCE($3, email),
      telefono = COALESCE($4, telefono),
      contacto_nombre = COALESCE($5, contacto_nombre),
      direccion = COALESCE($6, direccion),
      ciudad = COALESCE($7, ciudad),
      estado = COALESCE($8, estado),
      activo = COALESCE($9, activo),
      google_maps_url = COALESCE($10, google_maps_url),
      updated_at = NOW()
    WHERE id = $11 RETURNING *
  `, [nombre, rfc, email, telefono, contacto_nombre, direccion, ciudad, estado, activo, google_maps_url, id])

  if (!result.rows.length) throw createError({ statusCode: 404, message: 'Empresa no encontrada' })
  return { empresa: result.rows[0] }
})
