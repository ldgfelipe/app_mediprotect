import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user: any
  try {
    user = jwt.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  if (!['admin', 'asistente', 'Administrador'].includes(user.tipo)) {
    throw createError({ statusCode: 403, message: 'Acceso no autorizado' })
  }

  const pool = await useDbPool(event)

  // Estadísticas generales
  const statsResult = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE estado = 'pagado') as pagados,
      COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
      COUNT(*) FILTER (WHERE estado = 'fallido') as fallidos,
      COUNT(*) FILTER (WHERE estado = 'cancelado') as cancelados,
      COUNT(*) FILTER (WHERE estado = 'reembolsado') as reembolsados,
      COALESCE(SUM(monto) FILTER (WHERE estado = 'pagado'), 0) as total_ingresos,
      COALESCE(SUM(monto) FILTER (WHERE estado = 'pendiente'), 0) as total_pendiente,
      COALESCE(SUM(monto) FILTER (WHERE estado = 'pagado' AND sandbox = true), 0) as ingresos_sandbox
    FROM pagos
  `)

  // Últimos 30 días
  const monthlyResult = await pool.query(`
    SELECT
      DATE_TRUNC('day', created_at)::date as fecha,
      COUNT(*) as cantidad,
      COALESCE(SUM(monto) FILTER (WHERE estado = 'pagado'), 0) as ingresos
    FROM pagos
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY fecha DESC
  `)

  return {
    estadisticas: statsResult.rows[0],
    ultimos_30_dias: monthlyResult.rows
  }
})
