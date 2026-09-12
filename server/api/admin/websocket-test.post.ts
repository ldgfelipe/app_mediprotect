export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  if (decoded.tipo !== 'admin') {
    throw createError({ statusCode: 403, message: 'Solo admin' })
  }

  emitCitaEvento('cita:updated', {
    id: 'test-' + Date.now(),
    paciente_id: null,
    medico_id: null,
    estado: 'pendiente',
    paciente_nombre: 'Paciente de prueba',
    medico_nombre: 'Dr. Test',
    test: true,
  })

  return { ok: true, message: 'Evento de prueba enviado' }
})
