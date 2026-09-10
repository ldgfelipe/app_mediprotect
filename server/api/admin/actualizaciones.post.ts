import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  let decoded: any
  try { decoded = jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token invalido' }) }

  const body = await readBody(event)
  const { titulo, descripcion, tipo, version, estado } = body

  if (!titulo) throw createError({ statusCode: 400, message: 'El titulo es requerido' })

  const pool = useDbPool(event)
  const result = await pool.query(
    `INSERT INTO actualizaciones_sistema (titulo, descripcion, tipo, version, estado, creado_por)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [titulo, descripcion || '', tipo || 'mejora', version || '', estado || 'publicado', decoded.email || 'admin']
  )

  return { success: true, actualizacion: result.rows[0] }
})
