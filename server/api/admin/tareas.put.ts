import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token invalido' }) }

  const body = await readBody(event)
  const { id, titulo, descripcion, prioridad, estado, asignado_a, observaciones } = body

  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const pool = useDbPool()
  const result = await pool.query(
    `UPDATE tareas_pendientes SET
       titulo = COALESCE($1, titulo),
       descripcion = COALESCE($2, descripcion),
       prioridad = COALESCE($3, prioridad),
       estado = COALESCE($4, estado),
       asignado_a = COALESCE($5, asignado_a),
       observaciones = COALESCE($6, observaciones),
       updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [titulo, descripcion, prioridad, estado, asignado_a,
      observaciones ? JSON.stringify(observaciones) : null, id]
  )

  if (result.rowCount === 0) throw createError({ statusCode: 404, message: 'No encontrada' })
  return { success: true, tarea: result.rows[0] }
})
