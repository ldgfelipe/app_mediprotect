export default defineEventHandler(async (event) => {
  const _user = verifyAdminToken(event)

  const pool = await useDbPool(event)
  const query = getQuery(event)
  const periodo = query.periodo || new Date().toISOString().slice(0, 7)
  const [year, month] = periodo.split('-').map(Number)
  const fechaInicio = new Date(year, month - 1, 1)
  const fechaFin = new Date(year, month, 0, 23, 59, 59)

  const [stats, topMedicos] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) as total_citas,
        COUNT(*) FILTER (WHERE c.estado IN ('confirmada', 'asistida')) as citas_confirmadas,
        COALESCE(SUM(c.costo_consulta) FILTER (WHERE c.estado IN ('confirmada', 'asistida')), 0) as ingresos_totales,
        COALESCE(SUM(CASE COALESCE(m.comision_tipo, 1) WHEN 2 THEN 75 WHEN 3 THEN 50 ELSE 100 END) FILTER (WHERE c.estado IN ('confirmada', 'asistida')), 0) as comision_total,
        COUNT(DISTINCT c.id_medico) as medicos_con_citas
      FROM citas c
      LEFT JOIN medicos m ON m.id = c.id_medico
      WHERE c.fecha_hora >= $1 AND c.fecha_hora <= $2
    `, [fechaInicio, fechaFin]),
    pool.query(`
      SELECT
        m.id, m.nombre, m.apellido, m.precio_regular, COALESCE(m.comision_tipo, 1) as comision_tipo,
        COUNT(c.id) as citas_confirmadas,
        COALESCE(SUM(c.costo_consulta), 0) as ingresos,
        COALESCE(SUM(CASE COALESCE(m.comision_tipo, 1) WHEN 2 THEN 75 WHEN 3 THEN 50 ELSE 100 END), 0) as comision
      FROM citas c
      JOIN medicos m ON m.id = c.id_medico
      WHERE c.fecha_hora >= $1 AND c.fecha_hora <= $2
        AND c.estado IN ('confirmada', 'asistida')
      GROUP BY m.id, m.nombre, m.apellido, m.precio_regular, m.comision_tipo
      ORDER BY ingresos DESC
      LIMIT 10
    `, [fechaInicio, fechaFin])
  ])

  return { resumen: stats.rows[0], top_medicos: topMedicos.rows, periodo }
})
