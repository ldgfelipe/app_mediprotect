import { verifyAdminToken } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  await verifyAdminToken(event)

  const result = await pool.query(`DELETE FROM whatsapp_mensajes_log`)

  return {
    ok: true,
    message: 'Logs de WhatsApp eliminados correctamente',
    eliminados: result.rowCount
  }
})