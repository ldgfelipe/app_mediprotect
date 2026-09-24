import { verifyAdminToken } from '../../utils/auth'
import { getWhatsAppConfig } from '../../utils/whatsapp-db'
import { getInstanceState } from '../../utils/evolution-admin'

export default defineEventHandler(async (event) => {
  verifyAdminToken(event)
  const pool = await useDbPool(event)
  const config = await getWhatsAppConfig(pool)
  if (!config.instanceName) {
    return { ok: true, state: 'close', conectado: false, base64: '' }
  }

  const link = await pool.query(
    `SELECT clave, valor FROM configuracion_sistema WHERE clave IN ('whatsapp_link_state', 'whatsapp_link_qr')`
  )
  let state = 'close'
  let base64 = ''
  for (const row of link.rows) {
    if (row.clave === 'whatsapp_link_state') state = row.valor || 'close'
    if (row.clave === 'whatsapp_link_qr') base64 = row.valor || ''
  }

  if (state !== 'open') {
    try {
      const real = await getInstanceState(config)
      if (real === 'open') state = 'open'
    } catch {}
  }

  return { ok: true, state, conectado: state === 'open', base64 }
})