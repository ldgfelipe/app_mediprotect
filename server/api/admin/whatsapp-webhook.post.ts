import { verifyAdminToken } from '../../utils/auth'
import { getWhatsAppConfig } from '../../utils/whatsapp-db'
import { setWebhook } from '../../utils/evolution-admin'

export default defineEventHandler(async (event) => {
  verifyAdminToken(event)
  const pool = await useDbPool(event)
  const config = await getWhatsAppConfig(pool)
  if (!config.instanceName) {
    throw createError({ statusCode: 400, message: 'Primero guarda el nombre de la instancia en Configuración' })
  }

  const body = await readBody(event)
  const host = getRequestHost(event)
  const proto = getRequestProtocol(event)
  const url = body?.url || `${proto}://${host}/whook/wame`

  const cfg = useRuntimeConfig()
  const secret = cfg.whatsappWebhookApikey
  if (!secret) {
    console.warn('WHATSAPP_WEBHOOK_APIKEY no está configurado en el servidor; el webhook solo será aceptado desde loopback o IPs permitidas.')
  }

  await setWebhook(config, url, secret || undefined)
  return { ok: true, url, secreto: Boolean(secret) }
})