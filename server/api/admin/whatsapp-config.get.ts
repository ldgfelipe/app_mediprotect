import { getWhatsAppConfig } from '../../utils/whatsapp-db'

export default defineEventHandler(async (event) => {
  try {
    const pool = await useDbPool(event)
    const config = await getWhatsAppConfig(pool)
    return {
      ok: true,
      config: {
        gatewayUrl: config.gatewayUrl,
        instanceName: config.instanceName,
        apiKey: config.apiKey,
      }
    }
  } catch (e: any) {
    console.error('Error getting WhatsApp config:', e)
    throw createError({ statusCode: 500, message: 'Error al obtener configuración' })
  }
})