import { logMensaje, getOrCreateConversation, updateConversationState } from '../../utils/whatsapp-db'
import { processMessage, parsearSolicitudCita } from '../../utils/whatsapp-flow'
import { proseguirOIniciarFlujo } from '../../utils/whatsapp-flow-runner'
import { verifyAdminToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  verifyAdminToken(event)
  const pool = await useDbPool(event)
  const body = await readBody(event)

  const { telefono, mensaje } = body

  if (!telefono || !mensaje) {
    throw createError({ statusCode: 400, message: 'Se requiere telefono y mensaje' })
  }

  console.log(`[WhatsApp Simulador] Mensaje de ${telefono}: "${mensaje}"`)

  await logMensaje(pool, telefono, 'in', mensaje, 'text', `sim_${Date.now()}`)

  const conv = await getOrCreateConversation(pool, telefono, 'Simulador')
  const flowResult = await proseguirOIniciarFlujo(pool, conv, mensaje, 'Simulador')
  let respuesta = flowResult.respuesta

  if (!flowResult.flujoDetectado) {
    if (conv.estado === 'bienvenida') {
      const solicitud = parsearSolicitudCita(mensaje)
      if (solicitud.esSolicitudDirecta) {
        await updateConversationState(pool, conv.id, 'solicitud_directa', conv.datos_temp || {})
        conv.estado = 'solicitud_directa'
      }
    }

    respuesta = await processMessage(conv, mensaje, 'Simulador', pool)
  }

  if (respuesta) {
    await logMensaje(
      pool,
      telefono,
      'out',
      respuesta.texto,
      respuesta.lista ? 'list' : (respuesta.botones ? 'button' : 'text'),
      `sim_out_${Date.now()}`
    )
  }

  await updateConversationState(
    pool,
    conv.id,
    respuesta?.nuevoEstado || conv.estado,
    respuesta?.datosTemp || conv.datos_temp || {}
  )

  return {
    ok: true,
    respuesta: respuesta ? {
      texto: respuesta.texto,
      estado: respuesta.nuevoEstado,
      tieneLista: !!respuesta.lista,
      listaOpciones: respuesta.lista?.opciones || null,
      listaTitulo: respuesta.lista?.titulo_seccion || null,
      tieneBotones: !!respuesta.botones,
      botones: respuesta.botones || null,
    } : null,
    conversacion: {
      id: conv.id,
      telefono: conv.telefono,
      estado: respuesta?.nuevoEstado || conv.estado,
      datos_temp: respuesta?.datosTemp || conv.datos_temp || {},
    }
  }
})
