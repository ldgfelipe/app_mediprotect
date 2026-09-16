export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)

  const query = getQuery(event)
  const mode = query['hub.mode'] as string
  const token = query['hub.verify_token'] as string
  const challenge = query['hub.challenge'] as string

  console.log(`[WhatsApp Webhook] Verificación: mode=${mode}, token=${token}`)

  if (!mode || !token || !challenge) {
    console.log('[WhatsApp Webhook] Parámetros faltantes')
    throw createError({ statusCode: 400, message: 'Missing parameters' })
  }

  const result = await pool.query(
    `SELECT valor FROM configuracion_sistema WHERE clave = 'whatsapp_verify_token'`
  )
  const verifyToken = result.rows[0]?.valor

  if (!verifyToken) {
    console.log('[WhatsApp Webhook] Verify token no configurado en DB')
    throw createError({ statusCode: 500, message: 'Verify token not configured' })
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WhatsApp Webhook] ✅ Verificación exitosa')
    return challenge
  }

  console.log('[WhatsApp Webhook] ❌ Token no coincide')
  throw createError({ statusCode: 403, message: 'Forbidden' })
})
