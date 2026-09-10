import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const pool = useDbPool(event)
  const query = getQuery(event)
  const periodo = query.periodo || new Date().toISOString().slice(0, 7)
  const [year, month] = periodo.split('-').map(Number)
  const fechaInicio = new Date(year, month - 1, 1)
  const fechaFin = new Date(year, month, 0, 23, 59, 59)

  const [stats, topMedicos] = await Promise.all([
    pool.query(`
      SELECT 
        COUNT(*) as total_citas,
        COUNT(*) FILTER (WHERE estado IN ('confirmada', 'asistida')) as citas_confirmadas,
        COALESCE(SUM(costo_consulta) FILTER (WHERE estado IN ('confirmada', 'asistida')), 0) as ingresos_totales,
        COALESCE(SUM(costo_consulta * 0.15) FILTER (WHERE estado IN ('confirmada', 'asistida')), 0) as comision_total,
        COUNT(DISTINCT id_medico) as medicos_con_citas
      FROM citas
      WHERE fecha_hora >= $1 AND fecha_hora <= $2
    `, [fechaInicio, fechaFin]),
    pool.query(`
      SELECT 
        m.id, m.nombre, m.apellido, m.precio_regular,
        COUNT(c.id) as citas_confirmadas,
        COALESCE(SUM(c.costo_consulta), 0) as ingresos,
        COALESCE(SUM(c.costo_consulta * 0.15), 0) as comision
      FROM citas c
      JOIN medicos m ON m.id = c.id_medico
      WHERE c.fecha_hora >= $1 AND c.fecha_hora <= $2
        AND c.estado IN ('confirmada', 'asistida')
      GROUP BY m.id, m.nombre, m.apellido, m.precio_regular
      ORDER BY ingresos DESC
      LIMIT 10
    `, [fechaInicio, fechaFin])
  ])

  return { resumen: stats.rows[0], top_medicos: topMedicos.rows, periodo }
})