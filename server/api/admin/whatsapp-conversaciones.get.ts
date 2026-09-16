import { verifyAdminToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  await verifyAdminToken(event)

  const query = getQuery(event)
  const limite = parseInt(query.limite as string) || 50
  const offset = parseInt(query.offset as string) || 0
  const telefono = query.telefono as string
  const estado = query.estado as string

  let whereClause = '1=1'
  const params: any[] = []
  let paramIdx = 1

  if (telefono) {
    whereClause += ` AND wc.telefono = $${paramIdx}`
    params.push(telefono)
    paramIdx++
  }

  if (estado) {
    whereClause += ` AND wc.estado = $${paramIdx}`
    params.push(estado)
    paramIdx++
  }

  const conversaciones = await pool.query(
    `SELECT wc.*,
            (SELECT COUNT(*) FROM whatsapp_mensajes_log wml WHERE wml.telefono = wc.telefono) as total_mensajes,
            (SELECT wml.created_at FROM whatsapp_mensajes_log wml WHERE wml.telefono = wc.telefono ORDER BY wml.created_at DESC LIMIT 1) as ultimo_mensaje_at
     FROM whatsapp_conversaciones wc
     WHERE ${whereClause}
     ORDER BY ultimo_mensaje_at DESC NULLS LAST, wc.updated_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limite, offset]
  )

  const total = await pool.query(
    `SELECT COUNT(*) FROM whatsapp_conversaciones wc WHERE ${whereClause}`,
    params
  )

  const stats = await pool.query(
    `SELECT
       COUNT(*) as total_conversaciones,
       COUNT(*) FILTER (WHERE estado = 'bienvenida') as en_bienvenida,
       COUNT(*) FILTER (WHERE estado = 'cita_creada') as citas_creadas,
       COUNT(*) FILTER (WHERE estado IN ('seleccionando_doctor','seleccionando_fecha','seleccionando_hora')) as en_flujo,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as ultimas_24h,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as ultima_semana
     FROM whatsapp_conversaciones`
  )

  const mensajesHoy = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE direccion = 'in') as entrantes,
       COUNT(*) FILTER (WHERE direccion = 'out') as salientes
     FROM whatsapp_mensajes_log
     WHERE created_at > CURRENT_DATE`
  )

  const citasDesdeWhatsApp = await pool.query(
    `SELECT COUNT(*) as total
     FROM citas
     WHERE notas_paciente LIKE '%vía WhatsApp%'
     AND created_at > NOW() - INTERVAL '7 days'`
  )

  return {
    conversaciones: conversaciones.rows,
    total: parseInt(total.rows[0]?.count || '0'),
    stats: stats.rows[0],
    mensajesHoy: mensajesHoy.rows[0],
    citasDesdeWhatsApp: parseInt(citasDesdeWhatsApp.rows[0]?.total || '0'),
  }
})
