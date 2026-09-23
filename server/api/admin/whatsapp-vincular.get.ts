import { verifyAdminToken } from '../../utils/auth'
import { getWhatsAppConfig } from '../../utils/whatsapp-db'
import { getInstanceState } from '../../utils/evolution-admin'

export default defineEventHandler(async (event) => {
  verifyAdminToken(event)
  const pool = await useDbPool(event)
  const config = await getWhatsAppConfig(pool)
  if (!config.instanceName) {
    return { ok: true, state: 'close', conectado: false }
  }

  const state = await getInstanceState(config)
  return { ok: true, state, conectado: state === 'open' }
})