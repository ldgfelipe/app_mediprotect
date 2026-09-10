export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  if (decoded.tipo !== 'medico') {
    throw createError({ statusCode: 403, message: 'Acceso solo para médicos' })
  }

  const query = getQuery(event)
  const periodo = String(query.periodo || new Date().toISOString().slice(0, 7))
  const [year, month] = periodo.split('-').map(Number)
  if (!year || !month || month < 1 || month > 12) {
    throw createError({ statusCode: 400, message: 'Periodo inválido' })
  }
  const fechaInicio = new Date(year, month - 1, 1)
  const fechaFin = new Date(year, month, 0, 23, 59, 59)

  const pool = useDbPool()
  const [stats, detalle] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int as total_citas,
              COUNT(*) FILTER (WHERE estado IN ('confirmada', 'asistida'))::int as consultas_pagadas,
              COUNT(*) FILTER (WHERE estado IN ('pendiente', 'reagendada'))::int as citas_pendientes,
              COUNT(*) FILTER (WHERE estado IN ('cancelada', 'no_asistida'))::int as citas_no_pagadas,
              COALESCE(SUM(costo_consulta) FILTER (WHERE estado IN ('confirmada', 'asistida')), 0) as ingresos,
              COALESCE(SUM(costo_consulta * 0.15) FILTER (WHERE estado IN ('confirmada', 'asistida')), 0) as comision
       FROM citas
       WHERE id_medico = $1 AND fecha_hora >= $2 AND fecha_hora <= $3`,
      [decoded.id, fechaInicio, fechaFin]
    ),
    pool.query(
      `SELECT c.id, c.fecha_hora, c.estado, c.costo_consulta,
              p.nombre as paciente_nombre, p.apellido as paciente_apellido
       FROM citas c
       JOIN pacientes p ON p.id = c.id_paciente
       WHERE c.id_medico = $1 AND c.fecha_hora >= $2 AND c.fecha_hora <= $3
       ORDER BY c.fecha_hora DESC`,
      [decoded.id, fechaInicio, fechaFin]
    )
  ])

  const s = stats.rows[0]
  const ingresos = parseFloat(s.ingresos) || 0
  const comision = parseFloat(s.comision) || 0

  return {
    resumen: {
      total_citas: s.total_citas,
      consultas_pagadas: s.consultas_pagadas,
      citas_pendientes: s.citas_pendientes,
      citas_no_pagadas: s.citas_no_pagadas,
      ingresos,
      comision,
      ganancia: ingresos - comision,
      comision_porcentaje: 15
    },
    citas: detalle.rows.map((c: any) => ({
      ...c,
      costo_consulta: parseFloat(c.costo_consulta) || 0,
      comision: (parseFloat(c.costo_consulta) || 0) * 0.15
    })),
    periodo
  }
})
