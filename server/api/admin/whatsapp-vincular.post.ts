import { verifyAdminToken } from '../../utils/auth'
import { getWhatsAppConfig } from '../../utils/whatsapp-db'
import { connectInstance, logoutInstance } from '../../utils/evolution-admin'

export default defineEventHandler(async (event) => {
  verifyAdminToken(event)
  const pool = await useDbPool(event)
  const config = await getWhatsAppConfig(pool)
  if (!config.instanceName) {
    throw createError({ statusCode: 400, message: 'Primero guarda el nombre de la instancia en Configuración' })
  }

  const body = await readBody(event)
  const action = body?.action || 'connect'

  if (action === 'logout') {
    await logoutInstance(config)
    return { ok: true, state: 'close' }
  }

  const resultado = await connectInstance(config)
  return { ok: true, state: resultado.state, base64: resultado.base64 || '' }
})