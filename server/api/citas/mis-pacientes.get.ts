export default defineEventHandler(async (event) => {
  try {
  const decoded = verifyToken(event)
  if (decoded.tipo !== 'medico') {
    throw createError({ statusCode: 403, message: 'Acceso solo para médicos' })
  }

  const pool = await useDbPool(event)
  const result = await pool.query(
    `SELECT p.id, p.nombre, p.apellido, p.email, p.telefono,
            COUNT(c.id)::int as total_citas,
            COUNT(c.id) FILTER (WHERE c.estado IN ('asistida', 'confirmada'))::int as citas_asistidas,
            COUNT(c.id) FILTER (WHERE c.estado IN ('pendiente', 'reagendada'))::int as citas_pendientes,
            MAX(c.fecha_hora) as ultima_cita
     FROM pacientes p
     JOIN citas c ON c.id_paciente = p.id
     WHERE c.id_medico = $1
     GROUP BY p.id
     ORDER BY ultima_cita DESC NULLS LAST`,
    [decoded.id]
  )

  return {
    pacientes: result.rows,
    total: result.rows.length
  }

  } catch (err: any) {
    throw createError({ statusCode: 500, message: err?.message || 'Error interno del servidor' })
  }
})