export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const pool = await useDbPool(event)

  const limite = Math.min(parseInt(String(q.limite || '50'), 10) || 50, 500)
  const tipo = q.tipo ? String(q.tipo) : null
  const idMedico = q.id_medico ? String(q.id_medico) : null

  const condiciones: string[] = []
  const valores: any[] = []
  if (tipo) { valores.push(tipo); condiciones.push(`tipo = $${valores.length}`) }
  if (idMedico) { valores.push(idMedico); condiciones.push(`id_medico = $${valores.length}`) }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''

  try {
    const lista = await pool.query(
      `SELECT * FROM medico_clicks ${where} ORDER BY created_at DESC LIMIT ${limite}`,
      valores
    )
    const resumen = await pool.query(
      `SELECT tipo, origen, COUNT(*)::int AS total
         FROM medico_clicks ${where}
        GROUP BY tipo, origen
        ORDER BY total DESC`,
      valores
    )
    return { ok: true, total: lista.rows.length, clics: lista.rows, resumen: resumen.rows }
  } catch (e: any) {
    if (e?.code === '42P01') {
      return { ok: false, skip: true, error: 'Tabla medico_clicks no disponible' }
    }
    throw createError({ statusCode: 500, message: 'Error al consultar clics' })
  }
})
