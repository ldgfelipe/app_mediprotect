import { getWhatsAppConfig } from '../../utils/whatsapp-db'
import { enviarTemplate } from '../../utils/whatsapp'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)

  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  const config = await getWhatsAppConfig(pool)
  if (!config.token || !config.phoneNumberId) {
    return { ok: false, message: 'WhatsApp no configurado' }
  }

  const citasPendientes = await pool.query(
    `SELECT c.id, c.folio, c.fecha_hora, c.precio_acordado,
            p.nombre as paciente_nombre, p.telefono as paciente_telefono,
            m.nombre as medico_nombre, m.apellido as medico_apellido,
            m.especialidad
     FROM citas c
     JOIN pacientes p ON c.id_paciente = p.id
     LEFT JOIN medicos m ON c.id_medico = m.id
     WHERE c.fecha_hora BETWEEN NOW() + INTERVAL '22 hours' AND NOW() + INTERVAL '26 hours'
     AND c.estado IN ('pendiente', 'confirmada')
     AND c.recordatorio_24h_enviado = false`
  )

  let enviados = 0

  for (const cita of citasPendientes.rows) {
    if (!cita.paciente_telefono) continue

    try {
      await enviarTemplate(config, cita.paciente_telefono, 'recordatorio_cita_24h', 'es', [
        cita.paciente_nombre || 'Paciente',
        `Dr. ${cita.medico_nombre} ${cita.medico_apellido} — ${cita.especialidad || ''}`,
        new Date(cita.fecha_hora).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        cita.folio || 'N/A',
        `$${cita.precio_acordado || 0} MXN`,
      ])

      await pool.query(
        `UPDATE citas SET recordatorio_24h_enviado = true WHERE id = $1`,
        [cita.id]
      )

      await pool.query(
        `INSERT INTO whatsapp_recordatorios (id_cita, tipo, enviado_a)
         VALUES ($1, '24h', 'paciente')
         ON CONFLICT (id_cita, tipo, enviado_a) DO NOTHING`,
        [cita.id]
      )

      enviados++
      console.log(`[Cron 24h] ✅ Recordatorio enviado a ${cita.paciente_telefono} para cita ${cita.folio}`)
    } catch (err: any) {
      console.error(`[Cron 24h] ❌ Error enviando a ${cita.paciente_telefono}:`, err.message)
    }
  }

  return { ok: true, enviados, total: citasPendientes.rows.length }
})
