export default defineEventHandler(async (event) => {
  try {
    const decoded = verifyToken(event)
    if (decoded.tipo !== 'paciente') {
      throw createError({ statusCode: 403, message: 'Solo pacientes pueden agendar citas' })
    }

    const { id_medico, fecha_hora, notas_paciente } = await readBody(event)
    if (!id_medico || !fecha_hora) {
      throw createError({ statusCode: 400, message: 'id_medico y fecha_hora son requeridos' })
    }

    const pool = useDbPool(event)

    const medico = await pool.query('SELECT id FROM medicos WHERE id = $1 AND activo = true', [id_medico])
    if (medico.rows.length === 0) {
      throw createError({ statusCode: 404, message: 'Médico no encontrado' })
    }

    const existing = await pool.query(
      `SELECT id FROM citas WHERE id_medico = $1 AND fecha_hora = $2 AND estado NOT IN ('cancelada', 'no_asistida')`,
      [id_medico, fecha_hora]
    )
    if (existing.rows.length > 0) {
      throw createError({ statusCode: 409, message: 'El médico ya tiene una cita en ese horario' })
    }

    const result = await pool.query(
      `INSERT INTO citas (id_paciente, id_medico, fecha_hora, notas_paciente)
       VALUES ($1, $2, $3, $4)
       RETURNING id, id_paciente, id_medico, fecha_hora, estado, notas_paciente, created_at`,
      [decoded.id, id_medico, fecha_hora, notas_paciente || null]
    )

    setResponseStatus(event, 201)
    return { cita: result.rows[0] }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err?.message || 'Error interno del servidor' })
  }
})
