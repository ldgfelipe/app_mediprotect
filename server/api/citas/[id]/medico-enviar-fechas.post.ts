export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { fechas } = body // array de { fecha, horas: [] }

  if (!Array.isArray(fechas) || fechas.length === 0) {
    throw createError({ statusCode: 400, message: 'Se requiere array de fechas con horas' })
  }

  const citaRes = await pool.query(
    `SELECT c.*, m.whatsapp_telefono, m.nombre as medico_nombre, m.apellido as medico_apellido
     FROM citas c
     LEFT JOIN medicos m ON m.id = c.id_medico
     WHERE c.id = $1`,
    [id]
  )

  const cita = citaRes.rows[0]
  if (!cita) throw createError({ statusCode: 404, message: 'Cita no encontrada' })

  // Construir opciones de días
  const opcionesDia = fechas.map((f, i) => ({
    id: `cita_dia_${i}_${f.fecha}`,
    fecha: f.fecha,
  }))

  await pool.query(
    `UPDATE citas SET whatsapp_opciones = $2, updated_at = NOW() WHERE id = $1`,
    [id, JSON.stringify(opcionesDia)]
  )

  // Enviar lista de días al paciente por WhatsApp
  const { getWhatsAppConfig, enviarLista } = await import('../../../utils/whatsapp-db')
  const config = await getWhatsAppConfig(event)
  if (config.gatewayUrl && config.instanceName && cita.whatsapp_telefono) {
    const { enviarLista } = await import('../../../utils/whatsapp')
    const opciones = fechas.slice(0, 10).map((f, i) => ({
      id: `cita_dia_${i}_${f.fecha}`,
      titulo: f.fecha,
      descripcion: f.fecha,
    }))
    await import('../../../utils/whatsapp').then(m => m.enviarLista(
      { gatewayUrl: config.gatewayUrl, instanceName: config.instanceName, apiKey: config.apiKey },
      cita.whatsapp_telefono,
      `📅 *El médico ${cita.medico_nombre || ''} ${cita.medico_apellido || ''} te ofrece estas fechas:*`,
      opciones,
      'Fechas propuestas por el médico'
    ))
  }

  return { ok: true, mensaje: 'Fechas enviadas al paciente' }
})