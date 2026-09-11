export default defineEventHandler(async (event) => {
  try {
  const decoded = verifyToken(event)
  if (decoded.tipo !== 'medico') {
    throw createError({ statusCode: 403, message: 'Acceso solo para médicos' })
  
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err?.message || 'Error interno del servidor' })
  }}

  const pool = useDbPool(event)
  const result = await pool.query(
    `SELECT c.id, c.fecha_hora, c.estado, c.notas_paciente, c.notas_medico, c.created_at,
            p.id as paciente_id, p.nombre as paciente_nombre, p.apellido as paciente_apellido,
            p.telefono as paciente_telefono
     FROM citas c
     JOIN pacientes p ON p.id = c.id_paciente
     WHERE c.id_medico = $1
     ORDER BY c.fecha_hora DESC`, [decoded.id]
  )
  return { citas: result.rows }
})
