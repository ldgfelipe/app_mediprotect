import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const pool = getPool()
  const query = getQuery(event)
  const periodo = query.periodo || new Date().toISOString().slice(0, 7)
  const [year, month] = periodo.split('-').map(Number)
  const fechaInicio = new Date(year, month - 1, 1)
  const fechaFin = new Date(year, month, 0, 23, 59, 59)

  const result = await pool.query(`
    SELECT 
      m.id,
      m.nombre,
      m.apellido,
      m.precio_regular,
      m.especialidad,
      COALESCE(citas_stats.total_citas, 0) as total_citas,
      COALESCE(citas_stats.citas_confirmadas, 0) as citas_confirmadas,
      COALESCE(citas_stats.ingresos, 0) as ingresos,
      COALESCE(citas_stats.comision, 0) as comision
    FROM medicos m
    LEFT JOIN (
      SELECT 
        c.id_medico,
        COUNT(*) as total_citas,
        COUNT(*) FILTER (WHERE c.estado IN ('confirmada', 'asistida')) as citas_confirmadas,
        COALESCE(SUM(c.costo_consulta) FILTER (WHERE c.estado IN ('confirmada', 'asistida')), 0) as ingresos,
        COALESCE(SUM(c.costo_consulta * 0.15) FILTER (WHERE c.estado IN ('confirmada', 'asistida')), 0) as comision
      FROM citas c
      WHERE c.fecha_hora >= $1 AND c.fecha_hora <= $2
      GROUP BY c.id_medico
    ) citas_stats ON citas_stats.id_medico = m.id
    WHERE m.activo = true
    ORDER BY citas_stats.ingresos DESC NULLS LAST
  `, [fechaInicio, fechaFin])

  return { medicos: result.rows, periodo }
})