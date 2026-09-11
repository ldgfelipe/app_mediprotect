
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const body = await readBody(event)
  const { titulo, descripcion, prioridad, estado, asignado_a } = body

  if (!titulo) throw createError({ statusCode: 400, message: 'El titulo es requerido' })

  const pool = await useDbPool(event)
  const result = await pool.query(
    `INSERT INTO tareas_pendientes (titulo, descripcion, prioridad, estado, asignado_a)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [titulo, descripcion || '', prioridad || 'media', estado || 'pendiente', asignado_a || '']
  )

  return { success: true, tarea: result.rows[0] }
})
