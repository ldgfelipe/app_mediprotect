export default defineEventHandler(async (event) => {
  try {
  const decoded = verifyToken(event)
  if (decoded.tipo !== 'medico') {
    throw createError({ statusCode: 403, message: 'Solo médicos pueden confirmar citas' })
  }

  const { id } = getRouterParams(event)
  const pool = await useDbPool(event)

  const cita = await pool.query(
    'SELECT id, id_medico, id_paciente, estado FROM citas WHERE id = $1', [id]
  )
  if (cita.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Cita no encontrada' })
  }

  const c = cita.rows[0]
  if (c.id_medico !== decoded.id) {
    throw createError({ statusCode: 403, message: 'No autorizado para confirmar esta cita' })
  }
  if (c.estado !== 'pendiente') {
    throw createError({ statusCode: 400, message: 'Solo se pueden confirmar citas pendientes' })
  }

  await pool.query('UPDATE citas SET estado = $1, updated_at = NOW() WHERE id = $2', ['confirmada', id])

  const pacienteRow = await pool.query('SELECT nombre FROM pacientes WHERE id = $1', [c.id_paciente])
  const medicoRow = await pool.query('SELECT nombre, apellido FROM medicos WHERE id = $1', [decoded.id])

  emitCitaEvento('cita:confirmed', {
    id,
    paciente_id: c.id_paciente,
    medico_id: decoded.id,
    paciente_nombre: pacienteRow.rows[0]?.nombre || '',
    medico_nombre: medicoRow.rows[0] ? `${medicoRow.rows[0].nombre} ${medicoRow.rows[0].apellido}` : '',
    estado: 'confirmada',
  })

  return { mensaje: 'Cita confirmada exitosamente' }

  } catch (err: any) {
    throw createError({ statusCode: 500, message: err?.message || 'Error interno del servidor' })
  }
})