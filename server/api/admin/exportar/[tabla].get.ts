
function escCSV(val) {
  if (val == null) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const { tabla } = getRouterParams(event)
  const pool = useDbPool(event)

  const safe = /^[a-z_]+$/.test(tabla)
  if (!safe) throw createError({ statusCode: 400, message: 'Nombre de tabla inválido' })

  const colRes = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`,
    [tabla]
  )
  if (colRes.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Tabla no encontrada' })
  }

  const columns = colRes.rows.map((r: any) => r.column_name)
  const rows = await pool.query(`SELECT * FROM ${tabla}`)

  const header = columns.map(escCSV).join(',')
  const body = rows.rows.map((row: any) => columns.map(c => escCSV(row[c])).join(',')).join('\n')
  const csv = header + '\n' + body

  const encoded = Buffer.from('\uFEFF' + csv, 'utf-8')

  event.node.res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  event.node.res.setHeader('Content-Disposition', `attachment; filename="${tabla}.csv"`)
  event.node.res.setHeader('Content-Length', encoded.length)

  return encoded
})
