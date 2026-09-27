import { emitCitaEvento } from './socket-emitter'

interface OpcionHorario {
  id: string
  fecha: string
  hora: string
}

export async function procesarSeleccionHorarioCita(
  pool: any,
  telefono: string,
  texto: string
): Promise<{ matched: false } | { matched: true; respuesta: string }> {
  const match = texto.match(/^cita_slot:([^:]+):([^:]+):(\d+)$/)
  if (!match) return { matched: false }

  const [, citaId, , indiceTexto] = match
  const indice = Number(indiceTexto)
  const result = await pool.query(
    `SELECT c.id, c.id_paciente, c.id_medico, c.estado, c.fecha_hora,
            c.whatsapp_opciones, c.whatsapp_telefono, c.whatsapp_nombre,
            COALESCE(c.whatsapp_nombre, NULLIF(CONCAT_WS(' ', p.nombre, p.apellido), '')) AS paciente_nombre,
            COALESCE(c.whatsapp_medico_nombre, NULLIF(CONCAT_WS(' ', m.nombre, m.apellido), '')) AS medico_nombre
       FROM citas c
       LEFT JOIN pacientes p ON p.id = c.id_paciente
       LEFT JOIN medicos m ON m.id = c.id_medico
      WHERE c.id = $1
        AND regexp_replace(COALESCE(c.whatsapp_telefono, p.telefono, ''), '[^0-9]', '', 'g') =
            regexp_replace($2, '[^0-9]', '', 'g')`,
    [citaId, telefono]
  )
  const cita = result.rows[0]
  if (!cita || cita.estado !== 'PENDIENTE_DE_COORDINACION' || cita.fecha_hora) {
    return { matched: true, respuesta: 'Esa solicitud ya no está pendiente. Si necesitas ayuda, responde a este mensaje y te atenderemos.' }
  }

  const opciones = (cita.whatsapp_opciones || []) as OpcionHorario[]
  const opcion = opciones[indice]
  if (!opcion || opcion.id !== match[0]) {
    return { matched: true, respuesta: 'Esa opción ya no está disponible. Un asistente te enviará nuevos horarios.' }
  }

  const fechaHora = new Date(`${opcion.fecha}T${opcion.hora}:00Z`)
  if (Number.isNaN(fechaHora.getTime()) || fechaHora.toISOString().slice(0, 16) !== `${opcion.fecha}T${opcion.hora}`) {
    throw createError({ statusCode: 500, message: 'La opción de horario guardada no es válida' })
  }
  const updated = await pool.query(
    `UPDATE citas
        SET fecha_hora = $2::timestamp AT TIME ZONE 'America/Mexico_City',
            estado = 'pendiente',
            whatsapp_opciones = NULL, updated_at = NOW()
      WHERE id = $1 AND estado = 'PENDIENTE_DE_COORDINACION' AND fecha_hora IS NULL
        AND whatsapp_opciones @> $3::jsonb
      RETURNING id, id_paciente, id_medico, estado, fecha_hora`,
    [cita.id, `${opcion.fecha} ${opcion.hora}:00`, JSON.stringify([{ id: opcion.id }])]
  )
  if (!updated.rows[0]) {
    return { matched: true, respuesta: 'Esa opción ya no está disponible. Un asistente te ayudará a coordinar tu cita.' }
  }

  emitCitaEvento('cita:updated', {
    id: cita.id,
    paciente_id: cita.id_paciente,
    medico_id: cita.id_medico,
    paciente_nombre: cita.paciente_nombre || 'Paciente WhatsApp',
    medico_nombre: cita.medico_nombre || 'Médico solicitado',
    estado: 'pendiente',
    data: updated.rows[0],
  })
  return {
    matched: true,
    respuesta: `Gracias. Registramos tu preferencia para el ${opcion.fecha} a las ${opcion.hora}. El equipo confirmará la cita por WhatsApp.`,
  }
}
