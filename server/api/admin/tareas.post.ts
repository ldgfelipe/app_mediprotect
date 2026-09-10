import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token invalido' }) }

  const body = await readBody(event)
  const { titulo, descripcion, prioridad, estado, asignado_a } = body

  if (!titulo) throw createError({ statusCode: 400, message: 'El titulo es requerido' })

  const pool = useDbPool(event)
  const result = await pool.query(
    `INSERT INTO tareas_pendientes (titulo, descripcion, prioridad, estado, asignado_a)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [titulo, descripcion || '', prioridad || 'media', estado || 'pendiente', asignado_a || '']
  )

  return { success: true, tarea: result.rows[0] }
})
