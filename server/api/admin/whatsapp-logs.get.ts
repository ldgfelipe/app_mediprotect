import { verifyAdminToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  await verifyAdminToken(event)

  const query = getQuery(event)
  const limite = parseInt(query.limite as string) || 100
  const offset = parseInt(query.offset as string) || 0
  const direccion = query.direccion as string
  const telefono = query.telefono as string
  const tipo = query.tipo as string
  const fechaDesde = query.fecha_desde as string
  const fechaHasta = query.fecha_hasta as string

  let whereClause = '1=1'
  const params: any[] = []
  let paramIdx = 1

  if (direccion) {
    whereClause += ` AND wml.direccion = $${paramIdx}`
    params.push(direccion)
    paramIdx++
  }

  if (telefono) {
    whereClause += ` AND wml.telefono ILIKE $${paramIdx}`
    params.push(`%${telefono}%`)
    paramIdx++
  }

  if (tipo) {
    whereClause += ` AND wml.tipo = $${paramIdx}`
    params.push(tipo)
    paramIdx++
  }

  if (fechaDesde) {
    whereClause += ` AND wml.created_at >= $${paramIdx}`
    params.push(fechaDesde)
    paramIdx++
  }

  if (fechaHasta) {
    whereClause += ` AND wml.created_at <= $${paramIdx}`
    params.push(fechaHasta)
    paramIdx++
  }

  const logs = await pool.query(
    `SELECT wml.*,
            wc.nombre_paciente,
            wc.estado as conv_estado
     FROM whatsapp_mensajes_log wml
     LEFT JOIN whatsapp_conversaciones wc ON wml.telefono = wc.telefono
     WHERE ${whereClause}
     ORDER BY wml.created_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limite, offset]
  )

  const total = await pool.query(
    `SELECT COUNT(*) FROM whatsapp_mensajes_log wml WHERE ${whereClause}`,
    params
  )

  const stats = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE direccion = 'in') as entrantes,
       COUNT(*) FILTER (WHERE direccion = 'out') as salientes,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as ultima_hora,
       COUNT(*) FILTER (WHERE created_at > CURRENT_DATE) as hoy
     FROM whatsapp_mensajes_log`
  )

  const ultimas24h = await pool.query(
    `SELECT
       to_char(created_at AT TIME ZONE 'America/Mexico_City', 'HH24:00') as hora,
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE direccion = 'in') as entrantes,
       COUNT(*) FILTER (WHERE direccion = 'out') as salientes
     FROM whatsapp_mensajes_log
     WHERE created_at > NOW() - INTERVAL '24 hours'
     GROUP BY hora
     ORDER BY hora`
  )

  return {
    logs: logs.rows,
    total: parseInt(total.rows[0]?.count || '0'),
    stats: stats.rows[0],
    ultimas24h: ultimas24h.rows,
  }
})
