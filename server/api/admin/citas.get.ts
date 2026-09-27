
export default defineEventHandler(async (event) => {
const _user = verifyAdminOrAsistenteToken(event)

  const pool = await useDbPool(event)
  const result = await pool.query(`
    SELECT c.id, c.fecha_hora, c.estado, c.created_at, c.notas_paciente, c.notas_asistente,
           COALESCE(c.whatsapp_nombre, CONCAT_WS(' ', p.nombre, p.apellido)) as paciente_nombre,
           COALESCE(c.whatsapp_telefono, p.telefono) as paciente_telefono,
           CASE WHEN m.id IS NOT NULL THEN CONCAT(m.nombre, ' ', m.apellido)
                ELSE COALESCE(
                  NULLIF(c.whatsapp_medico_nombre, ''),
                  NULLIF(TRIM(BOTH '[]' FROM SPLIT_PART(c.notas_paciente, '[Médico:', 2)), ''),
                  'No especificado'
                )
           END as medico_nombre
    FROM citas c
    LEFT JOIN pacientes p ON c.id_paciente = p.id
    LEFT JOIN medicos m ON c.id_medico = m.id
    ORDER BY c.fecha_hora DESC NULLS LAST
  `)
  return { citas: result.rows }
})
