import { emitCitaEvento } from './socket-emitter'

interface OpcionHorario {
  id: string
  fecha: string
  hora: string
}

interface OpcionDia {
  id: string
  fecha: string
}

export async function procesarSeleccionHorarioCita(
  pool: any,
  telefono: string,
  texto: string
): Promise<{ matched: false } | { matched: true; respuesta: string }> {
  // Manejar selección de día (cita_dia_*)
  const diaMatch = texto.match(/^cita_dia_(\d+)_(.+)$/)
  if (diaMatch) {
    const indice = Number(diaMatch[1])
    const fecha = diaMatch[2]
    return await procesarSeleccionDia(pool, telefono, texto, indice, fecha)
  }

  // Manejar selección de hora (cita_hora_*)
  const horaMatch = texto.match(/^cita_hora_(\d+)_(.+)$/)
  if (horaMatch) {
    const indice = Number(horaMatch[1])
    const hora = horaMatch[2]
    return await procesarSeleccionHora(pool, telefono, texto, indice, hora)
  }

  // Respuesta numérica (las opciones se envían como texto numerado,
  // ya que WhatsApp bloqueó las listas interactivas).
  const numMatch = texto.match(/^[1-9]\d?$/)
  if (numMatch) {
    return await procesarSeleccionNumCita(pool, telefono, Number(numMatch[0]))
  }

  // Formato legacy: cita_slot:citaId:fecha:indice
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

  return await confirmarOpcionHorario(pool, cita, opcion)
}

async function procesarSeleccionNumCita(
  pool: any,
  telefono: string,
  numero: number
): Promise<{ matched: boolean; respuesta?: string }> {
  const result = await pool.query(
    `SELECT c.id, c.id_paciente, c.id_medico, c.estado, c.fecha_hora,
            c.whatsapp_opciones, c.whatsapp_telefono, c.whatsapp_nombre,
            COALESCE(c.whatsapp_nombre, NULLIF(CONCAT_WS(' ', p.nombre, p.apellido), '')) AS paciente_nombre,
            COALESCE(c.whatsapp_medico_nombre, NULLIF(CONCAT_WS(' ', m.nombre, m.apellido), '')) AS medico_nombre
       FROM citas c
       LEFT JOIN pacientes p ON p.id = c.id_paciente
       LEFT JOIN medicos m ON m.id = c.id_medico
      WHERE c.estado = 'PENDIENTE_DE_COORDINACION'
        AND c.fecha_hora IS NULL
        AND COALESCE(jsonb_array_length(c.whatsapp_opciones), 0) > 0
        AND regexp_replace(COALESCE(c.whatsapp_telefono, p.telefono, ''), '[^0-9]', '', 'g') =
            regexp_replace($1, '[^0-9]', '', 'g')
      ORDER BY c.created_at DESC
      LIMIT 1`,
    [telefono]
  )
  const cita = result.rows[0]
  if (!cita) return { matched: false }

  const opciones = (cita.whatsapp_opciones || []) as OpcionHorario[]
  const opcion = opciones[numero - 1]
  if (!opcion) {
    return { matched: true, respuesta: 'Esa opción ya no está disponible. Un asistente te enviará nuevos horarios.' }
  }

  // Solo fecha (día seleccionado) → enviar horas disponibles por texto
  if (opcion.fecha && !opcion.hora) {
    return await procesarSeleccionDia(pool, telefono, `cita_dia_${numero - 1}_${opcion.fecha}`, numero - 1, opcion.fecha)
  }

  // Fecha + hora → confirmar la cita
  return await confirmarOpcionHorario(pool, cita, opcion)
}

async function confirmarOpcionHorario(
  pool: any,
  cita: any,
  opcion: OpcionHorario
): Promise<{ matched: true; respuesta: string }> {
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

async function procesarSeleccionDia(
  pool: any,
  telefono: string,
  texto: string,
  indice: number,
  fecha: string
): Promise<{ matched: true; respuesta: string }> {
  // Buscar la cita pendiente por teléfono
  const result = await pool.query(
    `SELECT c.id, c.id_paciente, c.id_medico, c.estado, c.fecha_hora,
            c.whatsapp_opciones, c.whatsapp_telefono, c.whatsapp_nombre,
            COALESCE(c.whatsapp_nombre, NULLIF(CONCAT_WS(' ', p.nombre, p.apellido), '')) AS paciente_nombre,
            COALESCE(c.whatsapp_medico_nombre, NULLIF(CONCAT_WS(' ', m.nombre, m.apellido), '')) AS medico_nombre,
            c.id_medico
       FROM citas c
       LEFT JOIN pacientes p ON p.id = c.id_paciente
       LEFT JOIN medicos m ON m.id = c.id_medico
      WHERE c.estado = 'PENDIENTE_DE_COORDINACION'
        AND c.fecha_hora IS NULL
        AND regexp_replace(COALESCE(c.whatsapp_telefono, p.telefono, ''), '[^0-9]', '', 'g') =
            regexp_replace($1, '[^0-9]', '', 'g')
      ORDER BY c.created_at DESC
      LIMIT 1`,
    [telefono]
  )
  const cita = result.rows[0]
  if (!cita || cita.estado !== 'PENDIENTE_DE_COORDINACION' || cita.fecha_hora) {
    return { matched: true, respuesta: 'No hay solicitud pendiente para tu número. Si necesitas ayuda, responde a este mensaje.' }
  }

  const opcionesDia = (cita.whatsapp_opciones || []) as OpcionDia[]
  const opcion = opcionesDia[indice]
  if (!opcion || opcion.fecha !== fecha) {
    return { matched: true, respuesta: 'Esa fecha ya no está disponible. Un asistente te enviará nuevas opciones.' }
  }

  // Obtener horas disponibles para esa fecha
  const { getHorasDisponiblesParaMedico } = await import('./whatsapp-db')
  const horas = await getHorasDisponiblesParaMedico(pool, cita.id_medico, fecha)
  if (horas.length === 0) {
    return { matched: true, respuesta: `No hay horarios disponibles para el ${fecha}. Un asistente te contactará.` }
  }

  // Enviar lista de horas por WhatsApp
  const { getWhatsAppConfig, enviarLista } = await import('./whatsapp-db')
  const config = await getWhatsAppConfig(pool)
  if (!config.gatewayUrl || !config.instanceName) {
    return { matched: true, respuesta: 'WhatsApp no configurado para enviar horarios.' }
  }

  const opcionesHora = horas.slice(0, 10).map((h, i) => ({
    id: `cita_hora_${i}_${h.descripcion}`,
    titulo: h.titulo,
    descripcion: h.descripcion,
  }))

  await import('./whatsapp').then(m => m.enviarLista(
    { gatewayUrl: config.gatewayUrl, instanceName: config.instanceName, apiKey: config.apiKey },
    telefono,
    `🕐 *Elige una hora para el ${fecha}:*`,
    opcionesHora,
    'Horarios disponibles'
  ))

  // Guardar las opciones de hora en la cita
  await pool.query(
    `UPDATE citas SET whatsapp_opciones = $2, updated_at = NOW() WHERE id = $1`,
    [cita.id, JSON.stringify(horas.map((h, i) => ({ id: `cita_hora_${i}_${h.descripcion}`, fecha, hora: h.descripcion })))]
  )

  return {
    matched: true,
    respuesta: `Perfecto, fecha ${fecha} seleccionada. Te envié las horas disponibles por WhatsApp.`,
  }
}

async function procesarSeleccionHora(
  pool: any,
  telefono: string,
  texto: string,
  indice: number,
  hora: string
): Promise<{ matched: true; respuesta: string }> {
  const result = await pool.query(
    `SELECT c.id, c.id_paciente, c.id_medico, c.estado, c.fecha_hora,
            c.whatsapp_opciones, c.whatsapp_telefono, c.whatsapp_nombre,
            COALESCE(c.whatsapp_nombre, NULLIF(CONCAT_WS(' ', p.nombre, p.apellido), '')) AS paciente_nombre,
            COALESCE(c.whatsapp_medico_nombre, NULLIF(CONCAT_WS(' ', m.nombre, m.apellido), '')) AS medico_nombre
       FROM citas c
       LEFT JOIN pacientes p ON p.id = c.id_paciente
       LEFT JOIN medicos m ON m.id = c.id_medico
      WHERE c.estado = 'PENDIENTE_DE_COORDINACION'
        AND c.fecha_hora IS NULL
        AND regexp_replace(COALESCE(c.whatsapp_telefono, p.telefono, ''), '[^0-9]', '', 'g') =
            regexp_replace($1, '[^0-9]', '', 'g')
      ORDER BY c.created_at DESC
      LIMIT 1`,
    [telefono]
  )
  const cita = result.rows[0]
  if (!cita || cita.estado !== 'PENDIENTE_DE_COORDINACION' || cita.fecha_hora) {
    return { matched: true, respuesta: 'No hay solicitud pendiente para tu número.' }
  }

  const opcionesHora = (cita.whatsapp_opciones || []) as { id: string; fecha: string; hora: string }[]
  const opcion = opcionesHora[indice]
  if (!opcion || opcion.hora !== hora) {
    return { matched: true, respuesta: 'Esa hora ya no está disponible. Un asistente te ayudará.' }
  }

  const fechaHora = new Date(`${opcion.fecha}T${opcion.hora}:00Z`)
  if (Number.isNaN(fechaHora.getTime())) {
    throw createError({ statusCode: 500, message: 'La opción de horario guardada no es válida' })
  }

  const updated = await pool.query(
    `UPDATE citas
        SET fecha_hora = $2::timestamptz,
            estado = 'pendiente',
            whatsapp_opciones = NULL, updated_at = NOW()
      WHERE id = $1 AND estado = 'PENDIENTE_DE_COORDINACION' AND fecha_hora IS NULL
        AND whatsapp_opciones @> $3::jsonb
      RETURNING id, id_paciente, id_medico, estado, fecha_hora`,
    [cita.id, `${opcion.fecha} ${opcion.hora}:00`, JSON.stringify([{ id: `cita_hora_${indice}_${opcion.hora}` }])]
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
    respuesta: `✅ *¡Hora confirmada!*\n\n📅 Fecha: ${opcion.fecha}\n🕐 Hora: ${opcion.hora}\n\nTu cita ha sido registrada con fecha y hora confirmadas. El médico será notificado.\n\nTe enviaremos un recordatorio el día anterior a tu cita. 📲`,
  }
}
