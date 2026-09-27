import { randomUUID } from 'node:crypto'
import { verifyAdminOrAsistenteToken } from '../../../../utils/auth'
import { getWhatsAppConfig, logMensaje } from '../../../../utils/whatsapp-db'
import { enviarLista } from '../../../../utils/whatsapp'
import { emitCitaEvento } from '../../../../utils/socket-emitter'

interface OpcionHorario {
  fecha: string
  hora: string
}

function normalizarOpciones(value: unknown): OpcionHorario[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 10) {
    throw createError({ statusCode: 400, message: 'Indica entre 2 y 10 opciones de fecha y hora' })
  }
  const opciones = value.map((option) => {
    const fecha = typeof option?.fecha === 'string' ? option.fecha : ''
    const hora = typeof option?.hora === 'string' ? option.hora : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
      throw createError({ statusCode: 400, message: 'Cada opción requiere una fecha y hora válidas' })
    }
    const date = new Date(`${fecha}T${hora}:00Z`)
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 16) !== `${fecha}T${hora}`) {
      throw createError({ statusCode: 400, message: 'Cada opción requiere una fecha y hora válidas' })
    }
    return { fecha, hora }
  })
  if (new Set(opciones.map(({ fecha, hora }) => `${fecha}T${hora}`)).size !== opciones.length) {
    throw createError({ statusCode: 400, message: 'No repitas la misma fecha y hora en las opciones' })
  }
  return opciones
}

function etiquetaHorario({ fecha, hora }: OpcionHorario): string {
  const fechaTexto = new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-MX', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `${fechaTexto}, ${hora}`
}

export default defineEventHandler(async (event) => {
  verifyAdminOrAsistenteToken(event)
  const pool = await useDbPool(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const opciones = normalizarOpciones(body?.opciones)

  const result = await pool.query(
    `SELECT c.id, c.estado, c.fecha_hora, c.id_paciente, c.id_medico,
            COALESCE(c.whatsapp_telefono, p.telefono) AS telefono,
            COALESCE(c.whatsapp_nombre, NULLIF(CONCAT_WS(' ', p.nombre, p.apellido), '')) AS paciente_nombre,
            COALESCE(c.whatsapp_medico_nombre, NULLIF(CONCAT_WS(' ', m.nombre, m.apellido), '')) AS medico_nombre
       FROM citas c
       LEFT JOIN pacientes p ON p.id = c.id_paciente
       LEFT JOIN medicos m ON m.id = c.id_medico
      WHERE c.id = $1`,
    [id]
  )
  const cita = result.rows[0]
  if (!cita) throw createError({ statusCode: 404, message: 'Cita pendiente no encontrada' })
  if (cita.estado !== 'PENDIENTE_DE_COORDINACION' || cita.fecha_hora) {
    throw createError({ statusCode: 409, message: 'La cita ya no está pendiente de coordinar' })
  }
  if (!cita.telefono) {
    throw createError({ statusCode: 400, message: 'La cita no tiene un teléfono de WhatsApp para contactar al paciente' })
  }

  const offerId = randomUUID()
  const opcionesGuardadas = opciones.map((opcion, index) => ({
    ...opcion,
    id: `cita_slot:${cita.id}:${offerId}:${index}`,
  }))
  const config = await getWhatsAppConfig(pool)
  if (!config.gatewayUrl || !config.instanceName) {
    throw createError({ statusCode: 400, message: 'Configura la conexión de WhatsApp antes de enviar opciones' })
  }

  const guardado = await pool.query(
    `UPDATE citas
        SET whatsapp_opciones = $2::jsonb, updated_at = NOW()
      WHERE id = $1 AND estado = 'PENDIENTE_DE_COORDINACION' AND fecha_hora IS NULL
      RETURNING id`,
    [cita.id, JSON.stringify(opcionesGuardadas)]
  )
  if (!guardado.rows[0]) {
    throw createError({ statusCode: 409, message: 'La cita dejó de estar pendiente mientras se preparaban las opciones' })
  }

  const texto = `Hola${cita.paciente_nombre ? ` ${cita.paciente_nombre}` : ''}, hay opciones de horario para tu cita con ${cita.medico_nombre || 'el médico solicitado'}. Selecciona la que prefieras:`
  const opcionesWhatsApp = opcionesGuardadas.map((opcion) => ({
    id: opcion.id,
    titulo: etiquetaHorario(opcion),
  }))
  const envio = await enviarLista(config, cita.telefono, texto, opcionesWhatsApp, 'Horarios disponibles')
  await logMensaje(
    pool,
    cita.telefono,
    'out',
    `${texto}\n${opcionesWhatsApp.map((opcion, index) => `${index + 1}. ${opcion.titulo}`).join('\n')}`,
    'list',
    `cita_opciones_${cita.id}_${Date.now()}`,
    { cita_id: cita.id, pasarela: 'evolution', status_http: envio.status }
  )

  emitCitaEvento('cita:updated', {
    id: cita.id,
    paciente_id: cita.id_paciente,
    medico_id: cita.id_medico,
    paciente_nombre: cita.paciente_nombre || 'Paciente WhatsApp',
    medico_nombre: cita.medico_nombre || 'Médico solicitado',
    estado: cita.estado,
    data: cita,
  })

  return { ok: true, opciones: opcionesGuardadas }
})
