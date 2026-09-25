import { verifyAdminToken } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  verifyAdminToken(event)
  const pool = await useDbPool(event)
  const r = await pool.query(
    `SELECT id, nombre, descripcion, keywords, activo, definicion, created_at, updated_at
     FROM whatsapp_flows ORDER BY created_at ASC`
  )
  return { ok: true, flows: r.rows }
})
