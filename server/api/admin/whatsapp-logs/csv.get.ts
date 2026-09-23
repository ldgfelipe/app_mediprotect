import { verifyAdminToken } from '../../../utils/auth'

function escCSV(val: any) {
  if (val == null) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  await verifyAdminToken(event)

  const query = getQuery(event)
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

  const result = await pool.query(
    `SELECT wml.created_at,
            wml.direccion,
            wml.telefono,
            wc.nombre_paciente,
            wml.tipo,
            wml.mensaje,
            wml.whatsapp_msg_id,
            wc.estado as conv_estado,
            wml.metadata
     FROM whatsapp_mensajes_log wml
     LEFT JOIN whatsapp_conversaciones wc ON wml.telefono = wc.telefono
     WHERE ${whereClause}
     ORDER BY wml.created_at ASC`,
    params
  )

  const columns = [
    'fecha',
    'direccion',
    'telefono',
    'nombre_paciente',
    'tipo',
    'mensaje',
    'whatsapp_msg_id',
    'conv_estado',
    'metadata',
  ]

  const header = columns.map(escCSV).join(',')
  const body = result.rows
    .map((row: any) => columns.map((c) => escCSV(row[c])).join(','))
    .join('\n')
  const csv = header + '\n' + body

  const fecha = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
  const encoded = Buffer.from('\uFEFF' + csv, 'utf-8')

  event.node.res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  event.node.res.setHeader('Content-Disposition', `attachment; filename="whatsapp_logs_${fecha}.csv"`)
  event.node.res.setHeader('Content-Length', encoded.length)

  return encoded
})