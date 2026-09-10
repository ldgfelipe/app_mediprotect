export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  if (decoded.tipo !== 'medico') {
    throw createError({ statusCode: 403, message: 'Solo médicos pueden gestionar disponibilidad' })
  }

  const body = await readBody(event)
  const pool = useDbPool(event)

  const result = await pool.query(
    `INSERT INTO disponibilidad_medico (id_medico, dia_semana, hora_inicio, hora_fin)
     VALUES ($1, $2, $3, $4)
     RETURNING id, dia_semana, hora_inicio, hora_fin`,
    [decoded.id, body.dia_semana, body.hora_inicio, body.hora_fin]
  )

  setResponseStatus(event, 201)
  return { disponibilidad: result.rows[0] }
})
