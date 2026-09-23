import { getWhatsAppConfig, logMensaje, getOrCreateConversation, updateConversationState } from '../../utils/whatsapp-db'
import { processMessage, parsearSolicitudCita } from '../../utils/whatsapp-flow'
import { enviarMensaje, enviarLista, enviarBotones } from '../../utils/whatsapp'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)

  const webhookActivo = await pool.query(
    `SELECT valor FROM configuracion_sistema WHERE clave = 'whatsapp_webhook_activo'`
  )
  if (webhookActivo.rows[0]?.valor !== 'true') {
    console.log('[WhatsApp Webhook] Webhook desactivado, ignorando')
    return { ok: true }
  }

  const rawBody = await readRawBody(event)

  if (!rawBody) {
    return { ok: true }
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.log('[WhatsApp Webhook] Body no es JSON válido')
    return { ok: true }
  }

  if (payload.event !== 'messages.upsert') {
    return { ok: true }
  }

  const mensajes = Array.isArray(payload.data) ? payload.data : [payload.data]

  for (const msg of mensajes) {
    if (!msg || msg.key?.fromMe === true) continue
    await processIncomingMessage(msg, pool)
  }

  return { ok: true }
})

function extraerMensajeEvolution(msg: any) {
  const remoteJid = msg.key?.remoteJid || ''
  const telefono = String(remoteJid).replace(/@.*$/, '')

  const m = msg.message || {}
  let tipo = 'text'
  let texto = ''

  if (m.conversation) {
    texto = String(m.conversation || '')
  } else if (m.extendedTextMessage?.text) {
    texto = String(m.extendedTextMessage.text || '')
  } else if (m.buttonsResponseMessage?.selectedButtonId) {
    tipo = 'button'
    texto = String(m.buttonsResponseMessage.selectedButtonId || '')
  } else if (m.listResponseMessage?.singleSelectReply?.selectedRowId) {
    tipo = 'list'
    texto = String(m.listResponseMessage.singleSelectReply.selectedRowId || '')
  } else if (m.interactiveMessage?.nativeFlowResponseMessage?.paramsJson) {
    tipo = 'button'
    try {
      const params = JSON.parse(m.interactiveMessage.nativeFlowResponseMessage.paramsJson)
      texto = String(params.id || params.title || '')
    } catch {
      texto = String(m.interactiveMessage.nativeFlowResponseMessage.paramsJson || '')
    }
  } else if (m.templateButtonReplyMessage?.selectedId) {
    tipo = 'button'
    texto = String(m.templateButtonReplyMessage.selectedId || '')
  } else if (
    m.imageMessage || m.videoMessage || m.audioMessage || m.documentMessage ||
    m.stickerMessage || m.voiceMessage || m.ptvMessage
  ) {
    tipo = 'media'
    texto = String(
      m.imageMessage?.caption || m.videoMessage?.caption || m.documentMessage?.title || ''
    )
  }

  const msgId = String(msg.key?.id || `wa_${Date.now()}`)
  const nombre = String(msg.pushName || '')

  return { telefono, tipo, texto, msgId, nombre }
}

async function processIncomingMessage(msg: any, pool: any) {
  const { telefono, tipo, texto, msgId, nombre } = extraerMensajeEvolution(msg)

  if (!telefono) {
    console.log('[WhatsApp Webhook] Mensaje sin remitente, ignorando')
    return
  }

  console.log(`[WhatsApp Webhook] Mensaje de ${telefono}: "${texto}" (tipo: ${tipo})`)

  await logMensaje(pool, telefono, 'in', texto, tipo, msgId)

  const conv = await getOrCreateConversation(pool, telefono, nombre)

  if (conv.estado === 'bienvenida' && tipo === 'text') {
    const solicitud = parsearSolicitudCita(texto)
    if (solicitud.esSolicitudDirecta) {
      await updateConversationState(pool, conv.id, 'solicitud_directa', conv.datos_temp || {})
      conv.estado = 'solicitud_directa'
    }
  }

  const respuesta = await processMessage(conv, texto, nombre, pool)

  if (respuesta) {
    const config = await getWhatsAppConfig(pool)

    if (!config.gatewayUrl || !config.instanceName) {
      console.log('[WhatsApp Webhook] Pasarela Evolution no configurada, no se puede enviar')
      await logMensaje(
        pool,
        telefono,
        'out',
        '❌ Pasarela de WhatsApp no configurada',
        'text',
        `err_${Date.now()}`,
        { pasarela: 'evolution', error: 'gateway_no_configurado' }
      )
    } else {
      try {
        let envio: any
        if (respuesta.lista) {
          envio = await enviarLista(config, telefono, respuesta.texto, respuesta.lista.opciones, respuesta.lista.titulo_seccion)
        } else if (respuesta.botones) {
          envio = await enviarBotones(config, telefono, respuesta.texto, respuesta.botones)
        } else {
          envio = await enviarMensaje(config, telefono, respuesta.texto)
        }

        await logMensaje(
          pool,
          telefono,
          'out',
          respuesta.texto,
          respuesta.lista ? 'list' : (respuesta.botones ? 'button' : 'text'),
          `msg_${Date.now()}`,
          {
            pasarela: 'evolution',
            url_destino: envio.url,
            status_http: envio.status,
            evolution_respuesta: envio.data
          }
        )

        console.log(`[WhatsApp Webhook] Mensaje enviado vía Evolution. Status: ${envio.status}`)
      } catch (err: any) {
        console.error(`[WhatsApp Webhook] Error enviando mensaje vía Evolution:`, err.message)

        await logMensaje(
          pool,
          telefono,
          'out',
          `❌ Error enviando mensaje: ${err.message}`,
          'text',
          `err_${Date.now()}`,
          { pasarela: 'evolution', error: err.message }
        )
      }
    }
  }

  await updateConversationState(pool, conv.id, respuesta?.nuevoEstado || conv.estado, respuesta?.datosTemp || conv.datos_temp)
}