import { updateWhatsAppConfig } from '../../utils/whatsapp-db'

export default defineEventHandler(async (event) => {
  try {
    const pool = await useDbPool(event)
    const body = await readBody(event)
    const { gatewayUrl, instanceName, apiKey } = body

    if (!gatewayUrl || !instanceName) {
      throw createError({ statusCode: 400, message: 'Se requieren gatewayUrl e instanceName' })
    }

    if (!/^https?:\/\//i.test(gatewayUrl)) {
      throw createError({ statusCode: 400, message: 'gatewayUrl debe ser una URL http(s) válida' })
    }

    const result = await updateWhatsAppConfig(pool, gatewayUrl, instanceName, apiKey || undefined)

    return {
      ok: true,
      message: 'Configuración actualizada exitosamente',
      config: result
    }
  } catch (e: any) {
    console.error('Error updating WhatsApp config:', e)
    throw createError({ statusCode: 500, message: e.message || 'Error al actualizar configuración' })
  }
})