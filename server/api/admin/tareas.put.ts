
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const body = await readBody(event)
  const { id, titulo, descripcion, prioridad, estado, asignado_a, observaciones } = body

  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const pool = useDbPool(event)
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
