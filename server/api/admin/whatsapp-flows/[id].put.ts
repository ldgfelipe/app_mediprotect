import { verifyAdminToken } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  verifyAdminToken(event)
  const pool = await useDbPool(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const cur = await pool.query(`SELECT id FROM whatsapp_flows WHERE id = $1`, [id])
  if (!cur.rows[0]) throw createError({ statusCode: 404, message: 'Flujo no encontrado' })

  const nombre = typeof body?.nombre === 'string' && body.nombre.trim() ? body.nombre.trim() : null
  const parseKeywords = (val: any): string[] | null => {
    if (Array.isArray(val)) return val.map((k: string) => String(k).trim()).filter(Boolean)
    if (typeof val === 'string') return val.split(',').map((k: string) => k.trim()).filter(Boolean)
    return null
  }
  const keywords = parseKeywords(body?.keywords)
  const definicion = typeof body?.definicion === 'object' ? body.definicion : null
  const activo = typeof body?.activo === 'boolean' ? body.activo : null
  const descripcion = typeof body?.descripcion === 'string' ? body.descripcion : null

  await pool.query(
    `UPDATE whatsapp_flows SET
       nombre = COALESCE($2, nombre),
       keywords = COALESCE($3, keywords),
       definicion = COALESCE($4, definicion),
       activo = COALESCE($5, activo),
       descripcion = COALESCE($6, descripcion),
       updated_at = NOW()
     WHERE id = $1`,
    [id, nombre, keywords, definicion, activo, descripcion]
  )

  return { ok: true }
})