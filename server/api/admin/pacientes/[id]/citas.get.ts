export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  const pool = await useDbPool(event)

  const result = await pool.query(
    `SELECT c.id, c.fecha_hora, c.estado, c.notas_asistente, c.notas_paciente,
            m.nombre as medico_nombre, m.apellido as medico_apellido
     FROM citas c
     LEFT JOIN medicos m ON c.id_medico = m.id
     WHERE c.id_paciente = $1
     ORDER BY c.fecha_hora DESC`,
    [id]
  )

  return { citas: result.rows }
})