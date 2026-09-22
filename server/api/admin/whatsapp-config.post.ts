import { updateWhatsAppConfig } from '../../utils/whatsapp-db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { modo, apiBaseUrl, token } = body

    if (!modo || !apiBaseUrl) {
      throw createError({ statusCode: 400, message: 'Se requieren modo y apiBaseUrl' })
    }

    // Validar modo
    if (modo !== 'produccion' && modo !== 'pruebas') {
      throw createError({ statusCode: 400, message: 'Modo inválido. Use "produccion" o "pruebas"' })
    }

    const result = await updateWhatsAppConfig(
      event.context.pool,
      modo,
      apiBaseUrl,
      modo === 'produccion' ? token || null : undefined
    )

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