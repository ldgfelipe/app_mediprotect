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

    // Determinar modo y URL de envío
    const modo = config.modo
    const apiBaseUrl = config.apiBaseUrl
    const token = config.token

    console.log(`[WhatsApp Webhook] Modo de envío: ${modo}`)
    console.log(`[WhatsApp Webhook] URL base: ${apiBaseUrl}`)

    // Si el modo es producción y no hay token, usar defaults
    const effectiveToken = modo === 'produccion' ? (token || '') : ''
    const effectivePhoneNumberId = modo === 'produccion' ? config.phoneNumberId || '' : ''

    try {
      // Construir endpoint según modo
      let sendUrl: string
      let sendConfig: any

      if (modo === 'pruebas') {
        // Modo pruebas: enviar al simulador
        // El simulador acepta POST a /whook/wame
        // Extraemos phoneNumberId de la configuración o usamos el telefono directamente
        sendUrl = `${apiBaseUrl}/whook/wame`
        sendConfig = {
          // En modo pruebas, enviamos el cuerpo completo como viene de Meta
          // El simulador procesará el cuerpo tal como lo haría Meta
          telefono,
          token: effectiveToken,
          // No enviamos phoneNumberId en modo pruebas, el simulador lo ignora
        }
      } else {
        // Modo producción: enviar a Meta real
        if (!effectiveToken || !effectivePhoneNumberId) {
          console.log('[WhatsApp Webhook] WhatsApp no configurado en producción, no se puede enviar')
          return
        }
        sendUrl = `${apiBaseUrl}/${effectivePhoneNumberId}/messages`
        sendConfig = {
          messaging_product: 'whatsapp',
          to: telefono,
          type: 'text',
          text: { preview_url: false, body: respuesta.texto }
        }
      }

      // Determinar tipo de mensaje a enviar
      if (respuesta.lista) {
        // En modo pruebas, pasar las opciones completas
        if (modo === 'pruebas') {
          // Encontrar las opciones del response
          const opciones = respuesta.lista?.opciones || []
          sendConfig = {
            messaging_product: 'whatsapp',
            to: telefono,
            type: 'interactive',
            interactive: {
              type: 'list',
              header: { type: 'text', text: 'MediProtect' },
              body: { text: respuesta.texto },
              action: {
                button: 'Seleccionar',
                sections: [{
                  title: respuesta.lista.titulo_seccion || 'Opciones',
                  rows: opciones.map((o: any) => ({
                    id: o.id,
                    title: o.titulo,
                    description: o.descripcion || ''
                  }))
                }]
              }
            }
          }
        } else {
          // Modo producción usar la función existente
          await enviarLista(config, telefono, respuesta.texto, respuesta.lista.opciones, respuesta.lista.titulo_seccion)
        }
      } else if (respuesta.botones) {
        if (modo === 'pruebas') {
          // En modo pruebas, enviar botones al simulador
          const botones = respuesta.botones || []
          sendConfig = {
            messaging_product: 'whatsapp',
            to: telefono,
            type: 'interactive',
            interactive: {
              type: 'button',
              body: { text: respuesta.texto },
              action: {
                buttons: botones.map((b: any) => ({
                  type: 'reply',
                  reply: { id: b.id, title: b.titulo }
                }))
              }
            }
          }
        } else {
          await enviarBotones(config, telefono, respuesta.texto, respuesta.botones)
        }
      } else {
        // Mensaje de texto simple
        if (modo === 'pruebas') {
          sendConfig = {
            messaging_product: 'whatsapp',
            to: telefono,
            type: 'text',
            text: { preview_url: false, body: respuesta.texto }
          }
        } else {
          await enviarMensaje(config, telefono, respuesta.texto)
        }
      }

      // Enviar el mensaje
      if (modo === 'pruebas' && sendUrl) {
        const metaRes = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${effectiveToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sendConfig)
        })

        const metaData = await metaRes.json()
        const statusCode = metaRes.status

        // Loguear el envío independientemente del modo
        await logMensaje(
          pool,
          telefono,
          'out',
          respuesta.texto,
          respuesta.lista ? 'list' : (respuesta.botones ? 'button' : 'text'),
          `msg_${Date.now()}`,
          {
            ambiente: modo,
            url_destino: sendUrl,
            status_http: statusCode,
            meta_respuesta: metaData
          }
        )

        console.log(`[WhatsApp Webhook] Mensaje ${modo} enviado. Status: ${statusCode}`)
        console.log(`[WhatsApp Webhook] Respuesta Meta:`, metaData)
      }
    } catch (err: any) {
      console.error(`[WhatsApp Webhook] Error enviando mensaje ${modo}:`, err.message)

      // Loguear el error
      await logMensaje(
        pool,
        telefono,
        'out',
        `❌ Error enviando mensaje: ${err.message}`,
        'text',
        `err_${Date.now()}`,
        {
          ambiente: modo,
          error: err.message
        }
      )
    }
  }

  await updateConversationState(pool, conv.id, respuesta?.nuevoEstado || conv.estado, respuesta?.datosTemp || conv.datos_temp)
}
