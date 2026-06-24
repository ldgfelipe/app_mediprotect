export default defineEventHandler(async (event) => {
  const { id } = getRouterParams(event)
  const pool = getPool()

  const result = await pool.query(
    `SELECT m.id, m.nombre, m.apellido, m.email, m.telefono, m.cedula_profesional,
            m.consultorio_direccion, m.consultorio_ciudad, m.consultorio_estado, m.bio,
            m.foto_url, m.score_confianza, e.nombre as especialidad, e.id as especialidad_id
     FROM medicos m
     JOIN especialidades e ON e.id = m.id_especialidad
     WHERE m.id = $1 AND m.activo = true`, [id]
  )
  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Médico no encontrado' })
  }
  return { medico: result.rows[0] }
})
