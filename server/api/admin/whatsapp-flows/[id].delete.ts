import { verifyAdminToken } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  verifyAdminToken(event)
  const pool = await useDbPool(event)
  const id = getRouterParam(event, 'id')
  const r = await pool.query(`DELETE FROM whatsapp_flows WHERE id = $1 RETURNING id`, [id])
  if (!r.rows[0]) throw createError({ statusCode: 404, message: 'Flujo no encontrado' })
  return { ok: true }
})