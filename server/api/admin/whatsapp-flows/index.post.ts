import { verifyAdminToken } from '../../../utils/auth'
import { plantillaCitas, plantillaAsesor } from '../../../utils/flow-templates'

export default defineEventHandler(async (event) => {
  verifyAdminToken(event)
  const pool = await useDbPool(event)
  const body = await readBody(event)

  if (body?.plantilla) {
    const plantillas: Record<string, any> = {
      citas: plantillaCitas(),
      asesor: plantillaAsesor(),
    }
    const tpl = plantillas[body.plantilla]
    if (!tpl) throw createError({ statusCode: 400, message: 'Plantilla no encontrada' })

    const existe = await pool.query(`SELECT id FROM whatsapp_flows WHERE nombre = $1`, [body.plantilla])
    if (existe.rows[0]) {
      await pool.query(
        `UPDATE whatsapp_flows SET keywords = $2, descripcion = $3, definicion = $4, activo = true, updated_at = NOW(), nombre = $1 WHERE id = $5`,
        [body.plantilla, tpl.keywords, tpl.descripcion, tpl.definicion, existe.rows[0].id]
      )
      return { ok: true, id: existe.rows[0].id, crear: true }
    }

    const r = await pool.query(
      `INSERT INTO whatsapp_flows (nombre, keywords, descripcion, definicion, activo)
       VALUES ($1, $2, $3, $4, true) RETURNING id`,
      [body.plantilla, tpl.keywords, tpl.descripcion, tpl.definicion]
    )
    return { ok: true, id: r.rows[0].id, crear: true }
  }

  const nombre = String(body?.nombre || '').trim()
  if (!nombre) throw createError({ statusCode: 400, message: 'Falta el nombre del flujo' })

  const keywords = Array.isArray(body?.keywords) ? body.keywords.map((k: string) => String(k).trim()).filter(Boolean) : []
  const definicion = body?.definicion || { nodes: [], edges: [] }

  const r = await pool.query(
    `INSERT INTO whatsapp_flows (nombre, keywords, definicion, activo)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [nombre, keywords, definicion, body?.activo !== false]
  )
  return { ok: true, id: r.rows[0].id }
})
