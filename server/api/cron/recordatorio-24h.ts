import { getWhatsAppConfig } from '../../utils/whatsapp-db'
import { enviarMensaje } from '../../utils/whatsapp'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)

  const secret = getHeader(event, 'x-cron-secret') || getHeader(event, 'authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (!expected || secret !== expected) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  const ahora = new Date()
  const manana = new Date(ahora)
  manana.setDate(manana.getDate() + 1)
  const mananaStr = manana.toISOString().split('T')[0]

  const result = await pool.query(
    `SELECT c.*, 
            COALESCE(p.nombre, '') || ' ' || COALESCE(p.apellido, '') AS paciente_nombre,
            p.telefono AS paciente_telefono,
            COALESCE(m.nombre, '') || ' ' || COALESCE(m.apellido, '') AS medico_nombre,
            m.whatsapp_telefono AS medico_whatsapp,
            m.id AS medico_id
       FROM citas c
       LEFT JOIN pacientes p ON p.id = c.id_paciente
       LEFT JOIN medicos m ON m.id = c.id_medico
      WHERE c.fecha_hora::date = $1::date
        AND c.estado IN ('pendiente', 'confirmada')
        AND (c.recordatorio_enviado IS NULL OR c.recordatorio_enviado = false)`,
    [mananaStr]
  )

  const config = await getWhatsAppConfig(event)
  if (!config.gatewayUrl || !config.instanceName) {
    return { ok: true, message: 'WhatsApp no configurado, omitiendo recordatorios' }
  }

  let enviados = 0
  let errores = 0

  for (const cita of result.rows) {
    const fechaHora = new Date(cita.fecha_hora)
    const horaStr = fechaHora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })
    const fechaStr = fechaHora.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' })

    try {
      // Recordatorio al paciente
      if (cita.paciente_telefono) {
        const textoPaciente = `⏰ *Recordatorio de cita - Mañana*\n\n👨‍⚕️ Dr. ${cita.medico_nombre}\n📅 ${fechaStr}\n🕐 ${horaStr}\n📋 Folio: *${cita.folio}*\n\nPor favor confirma tu asistencia respondiendo *SI* o *NO*.\n\n📍 Llegar 10 min antes con identificación oficial.`
        await enviarMensaje(
          { gatewayUrl: config.gatewayUrl, instanceName: config.instanceName, apiKey: config.apiKey },
          cita.paciente_telefono,
          textoPaciente
        )
      }

      // Recordatorio al médico
      if (cita.medico_whatsapp) {
        const textoMedico = `⏰ *Recordatorio de cita - Mañana*\n\n👤 Paciente: ${cita.paciente_nombre || 'Paciente WhatsApp'}\n📅 ${fechaStr}\n🕐 ${horaStr}\n📋 Folio: *${cita.folio}*\n\nPor favor confirma la asistencia del paciente respondiendo *SI* o *NO*.`
        await enviarMensaje(
          { gatewayUrl: config.gatewayUrl, instanceName: config.instanceName, apiKey: config.apiKey },
          cita.medico_whatsapp,
          textoMedico
        )
      }

      await pool.query(
        `UPDATE citas SET recordatorio_enviado = true, updated_at = NOW() WHERE id = $1`,
        [cita.id]
      )
      enviados++
    } catch (err: any) {
      console.error(`[Recordatorio 24h] Error en cita ${cita.id}:`, err.message)
      errores++
    }
  }

  return { ok: true, enviadas: result.rows.length, enviadas_ok: enviados, errores }
})