import { getWhatsAppConfig, logMensaje, getOrCreateConversation, updateConversationState } from '../../utils/whatsapp-db'
import { processMessage } from '../../utils/whatsapp-flow'
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

  const entry = payload.entry?.[0]
  if (!entry) {
    return { ok: true }
  }

  const changes = entry.changes?.[0]
  if (!changes) {
    return { ok: true }
  }

  const value = changes.value

  if (value.messages) {
    for (const msg of value.messages) {
      await processIncomingMessage(msg, value.contacts, pool)
    }
  }

  if (value.statuses) {
    for (const status of value.statuses) {
      console.log(`[WhatsApp Webhook] Status update: ${status.status} for ${status.id}`)
    }
  }

  return { ok: true }
})

async function processIncomingMessage(msg: any, contacts: any[], pool: any) {
  const telefono = msg.from
  const tipo = msg.type
  let texto = ''

  if (tipo === 'text') {
    texto = msg.text?.body || ''
  } else if (tipo === 'interactive') {
    if (msg.interactive.type === 'list_reply') {
      texto = msg.interactive.list_reply.id
    } else if (msg.interactive.type === 'button_reply') {
      texto = msg.interactive.button_reply.id
    }
  }

  const contacto = contacts?.find((c: any) => c.wa_id === telefono)
  const nombre = contacto?.profile?.name || ''

  console.log(`[WhatsApp Webhook] Mensaje de ${telefono}: "${texto}" (tipo: ${tipo})`)

  await logMensaje(pool, telefono, 'in', texto, tipo, msg.id)

  const conv = await getOrCreateConversation(pool, telefono, nombre)
  const respuesta = await processMessage(conv, texto, nombre, pool)

  if (respuesta) {
    const config = await getWhatsAppConfig(pool)
    if (!config.token || !config.phoneNumberId) {
      console.log('[WhatsApp Webhook] WhatsApp no configurado, no se puede enviar')
      return
    }

    try {
      if (respuesta.lista) {
        await enviarLista(config, telefono, respuesta.texto, respuesta.lista.opciones, respuesta.lista.titulo_seccion)
      } else if (respuesta.botones) {
        await enviarBotones(config, telefono, respuesta.texto, respuesta.botones)
      } else {
        await enviarMensaje(config, telefono, respuesta.texto)
      }
      await logMensaje(pool, telefono, 'out', respuesta.texto, respuesta.lista ? 'list' : (respuesta.botones ? 'button' : 'text'))
    } catch (err: any) {
      console.error(`[WhatsApp Webhook] Error enviando mensaje:`, err.message)
    }
  }

  await updateConversationState(pool, conv.id, respuesta?.nuevoEstado || conv.estado, respuesta?.datosTemp || conv.datos_temp)
}
