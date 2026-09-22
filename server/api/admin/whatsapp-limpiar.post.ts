import { logMensaje } from '../../utils/whatsapp-db'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  const body = await readBody(event)

  const { telefono } = body

  if (!telefono) {
    throw createError({ statusCode: 400, message: 'Se requiere telefono' })
  }

  console.log(`[WhatsApp Simulador] Limpiando mensajes de ${telefono}`)

  await pool.query(
    `DELETE FROM whatsapp_mensajes_log WHERE telefono = $1`,
    [telefono]
  )

  await pool.query(
    `DELETE FROM whatsapp_conversaciones WHERE telefono = $1`,
    [telefono]
  )

  return { ok: true, message: 'Mensajes y conversación eliminados' }
})
