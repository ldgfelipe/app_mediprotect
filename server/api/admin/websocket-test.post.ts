export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  if (decoded.tipo !== 'admin') {
    throw createError({ statusCode: 403, message: 'Solo admin' })
  }

  const pool = await useDbPool(event)
  const paciente = await pool.query('SELECT id, nombre FROM pacientes LIMIT 1')
  const medico = await pool.query('SELECT id, nombre, apellido FROM medicos LIMIT 1')

  const p = paciente.rows[0] || { id: '0', nombre: 'Paciente' }
  const m = medico.rows[0] || { id: '0', nombre: 'Dr.', apellido: 'Demo' }

  emitCitaEvento('cita:updated', {
    id: 'test-' + Date.now(),
    paciente_id: p.id,
    medico_id: m.id,
    paciente_nombre: p.nombre,
    medico_nombre: `${m.nombre} ${m.apellido}`,
    estado: 'confirmada',
    test: true,
  })

  return { ok: true, message: 'Evento de prueba enviado a admins, asistentes, paciente y médico' }
})
