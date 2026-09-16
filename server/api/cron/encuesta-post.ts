import { getWhatsAppConfig } from '../../utils/whatsapp-db'
import { enviarBotones } from '../../utils/whatsapp'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)

  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  const config = await getWhatsAppConfig(pool)
  if (!config.token || !config.phoneNumberId) {
    return { ok: false, message: 'WhatsApp no configurado' }
  }

  const citasParaEncuesta = await pool.query(
    `SELECT c.id, c.folio, c.fecha_hora,
            p.nombre as paciente_nombre, p.telefono as paciente_telefono,
            m.nombre as medico_nombre, m.apellido as medico_apellido,
            m.telefono as medico_telefono, m.telefono_recepcion
     FROM citas c
     JOIN pacientes p ON c.id_paciente = p.id
     LEFT JOIN medicos m ON c.id_medico = m.id
     WHERE c.fecha_hora BETWEEN NOW() - INTERVAL '3 hours' AND NOW() - INTERVAL '2 hours'
     AND c.estado = 'confirmada'
     AND c.encuesta_enviada = false`
  )

  let encuestasPaciente = 0
  let encuestasDoctor = 0

  for (const cita of citasParaEncuesta.rows) {
    if (cita.paciente_telefono) {
      try {
        await enviarBotones(config, cita.paciente_telefono,
          `¡Hola ${cita.paciente_nombre || ''}! 🌟\n\nEsperamos que tu consulta con *Dr. ${cita.medico_nombre} ${cita.medico_apellido}* haya sido de tu agrado.\n\nAyúdanos a evaluar tu experiencia para mantener activa tu cobertura de precios preferenciales:\n\n📌 Folio: ${cita.folio || 'N/A'}`,
          [
            { id: `encuesta_5_${cita.id}`, titulo: '⭐⭐⭐⭐⭐ Excelente' },
            { id: `encuesta_3_${cita.id}`, titulo: '⭐⭐⭐ Regular' },
            { id: `encuesta_no_${cita.id}`, titulo: 'No pude asistir' },
          ]
        )

        await pool.query(
          `INSERT INTO whatsapp_recordatorios (id_cita, tipo, enviado_a)
           VALUES ($1, 'encuesta_paciente', 'paciente')
           ON CONFLICT (id_cita, tipo, enviado_a) DO NOTHING`,
          [cita.id]
        )

        encuestasPaciente++
        console.log(`[Cron Encuesta] ✅ Encuesta paciente: ${cita.paciente_telefono}`)
      } catch (err: any) {
        console.error(`[Cron Encuesta] ❌ Error encuesta paciente ${cita.paciente_telefono}:`, err.message)
      }
    }

    const telefonoDoctor = cita.telefono_recepcion || cita.medico_telefono
    if (telefonoDoctor) {
      try {
        await enviarBotones(config, telefonoDoctor,
          `MediProtect — Confirmación de asistencia\n\n📌 Folio: ${cita.folio || 'N/A'}\n👤 Paciente: ${cita.paciente_nombre || 'N/A'}\n📅 Fecha: ${new Date(cita.fecha_hora).toLocaleDateString('es-MX')}\n\n¿El paciente asistió a la consulta?`,
          [
            { id: `doc_si_${cita.id}`, titulo: '✅ Asistió' },
            { id: `doc_no_${cita.id}`, titulo: '❌ No asistió' },
          ]
        )

        await pool.query(
          `INSERT INTO whatsapp_recordatorios (id_cita, tipo, enviado_a)
           VALUES ($1, 'encuesta_doctor', 'doctor')
           ON CONFLICT (id_cita, tipo, enviado_a) DO NOTHING`,
          [cita.id]
        )

        encuestasDoctor++
        console.log(`[Cron Encuesta] ✅ Encuesta doctor: ${telefonoDoctor}`)
      } catch (err: any) {
        console.error(`[Cron Encuesta] ❌ Error encuesta doctor ${telefonoDoctor}:`, err.message)
      }
    }
  }

  await pool.query(
    `UPDATE citas SET encuesta_enviada = true
     WHERE id IN (
       SELECT c.id FROM citas c
       WHERE c.fecha_hora BETWEEN NOW() - INTERVAL '3 hours' AND NOW() - INTERVAL '2 hours'
       AND c.estado = 'confirmada'
       AND c.encuesta_enviada = false
     )`
  )

  return { ok: true, encuestasPaciente, encuestasDoctor, total: citasParaEncuesta.rows.length }
})
