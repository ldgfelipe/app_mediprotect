import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const body = await readBody(event)
  const pool = getPool()

  const result = await pool.query(`
    INSERT INTO empresas (nombre, rfc, email, telefono, contacto_nombre, direccion, ciudad, estado)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
  `, [body.nombre, body.rfc, body.email, body.telefono, body.contacto_nombre, body.direccion, body.ciudad, body.estado])

  setResponseStatus(event, 201)
  return { empresa: result.rows[0] }
})
