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

  let state: string | null = null
  try {
    state = await getInstanceState(config)
  } catch (e: any) {
    console.error('[Vincular] No se pudo consultar Evolution:', e?.message)
  }

  const link = await pool.query(
    `SELECT clave, valor FROM configuracion_sistema WHERE clave IN ('whatsapp_link_state', 'whatsapp_link_qr')`
  )
  const db: Record<string, string> = {}
  for (const row of link.rows) db[row.clave] = row.valor || ''
  const dbBase64 = db.whatsapp_link_qr || ''

  if (!state) {
    state = db.whatsapp_link_state || 'close'
  } else if (state === 'open') {
    await pool.query(
      `INSERT INTO configuracion_sistema (clave, valor, categoria) VALUES ('whatsapp_link_state', 'open', 'whatsapp_link')
       ON CONFLICT (clave) DO UPDATE SET valor = 'open', updated_at = NOW()`
    )
    await pool.query(`UPDATE configuracion_sistema SET valor = '' WHERE clave = 'whatsapp_link_qr'`)
  }

  const base64 = state === 'open' ? '' : dbBase64
  return { ok: true, state, conectado: state === 'open', base64 }
})