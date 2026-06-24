import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'default_secret') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const body = await readBody(event)
  const pool = getPool()

  const result = await pool.query(
    'INSERT INTO paquetes (nombre, descripcion, precio, duracion_dias) VALUES ($1,$2,$3,$4) RETURNING *',
    [body.nombre, body.descripcion, body.precio, body.duracion_dias]
  )
  setResponseStatus(event, 201)
  return { plan: result.rows[0] }
})
