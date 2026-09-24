import { verifyAdminToken } from '../../utils/auth'
import { getWhatsAppConfig } from '../../utils/whatsapp-db'
import { connectInstance, logoutInstance, setWebhook } from '../../utils/evolution-admin'

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
    await pool.query(`UPDATE configuracion_sistema SET valor = '' WHERE clave = 'whatsapp_link_qr'`)
    return { ok: true, state: 'close', base64: '' }
  }

  await connectInstance(config)

  const cfg = useRuntimeConfig()
  const secret = cfg.whatsappWebhookApikey
  const url = `https://${getRequestHost(event)}/whook/wame`
  await setWebhook(config, url, secret || undefined)

  const link = await pool.query(
    `SELECT clave, valor FROM configuracion_sistema WHERE clave IN ('whatsapp_link_state', 'whatsapp_link_qr')`
  )
  let state = 'close'
  let base64 = ''
  for (const row of link.rows) {
    if (row.clave === 'whatsapp_link_state') state = row.valor || 'close'
    if (row.clave === 'whatsapp_link_qr') base64 = row.valor || ''
  }

  return { ok: true, state, base64 }
})