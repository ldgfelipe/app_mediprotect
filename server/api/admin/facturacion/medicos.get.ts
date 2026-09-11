export default defineEventHandler(async (event) => {
  const _user = verifyAdminToken(event)

  const pool = useDbPool(event)
  const query = getQuery(event)
  const periodo = query.periodo || new Date().toISOString().slice(0, 7)
  const [year, month] = periodo.split('-').map(Number)
  const fechaInicio = new Date(year, month - 1, 1)
  const fechaFin = new Date(year, month, 0, 23, 59, 59)
  const search = query.search || ''
  const page = Math.max(1, parseInt(query.page) || 1)
  const limit = Math.min(50, parseInt(query.limit) || 20)
  const offset = (page - 1) * limit

  let where = `WHERE c.fecha_hora >= $1 AND c.fecha_hora <= $2`
  const params: any[] = [fechaInicio, fechaFin]
  let paramIdx = 3

  if (search) {
    where += ` AND (m.nombre ILIKE $${paramIdx} OR m.apellido ILIKE $${paramIdx} OR e.nombre ILIKE $${paramIdx})`
    params.push(`%${search}%`)
    paramIdx++
  }

  const totalResult = await pool.query(`
    SELECT COUNT(DISTINCT m.id)
    FROM medicos m
    LEFT JOIN citas c ON c.id_medico = m.id
    LEFT JOIN especialidades e ON e.id = m.id_especialidad
    ${where}
    GROUP BY m.id
    HAVING COUNT(c.id) > 0
  `, params)
  const total = parseInt(totalResult.rows[0]?.count || '0')

  const result = await pool.query(`
    SELECT
      m.id, m.nombre, m.apellido, m.precio_regular, m.precio_miembro,
      COALESCE(m.comision_tipo, 1) as comision_tipo,
      e.nombre as especialidad_nombre,
      COUNT(c.id) as total_citas,
      COUNT(c.id) FILTER (WHERE c.estado IN ('confirmada', 'asistida')) as citas_confirmadas,
      COALESCE(SUM(c.costo_consulta) FILTER (WHERE c.estado IN ('confirmada', 'asistida')), 0) as ingresos,
      COALESCE(SUM(CASE COALESCE(m.comision_tipo, 1) WHEN 2 THEN 75 WHEN 3 THEN 50 ELSE 100 END) FILTER (WHERE c.estado IN ('confirmada', 'asistida')), 0) as comision
    FROM medicos m
    LEFT JOIN especialidades e ON e.id = m.id_especialidad
    LEFT JOIN citas c ON c.id_medico = m.id ${where}
    GROUP BY m.id, m.nombre, m.apellido, m.precio_regular, m.precio_miembro, e.nombre, m.comision_tipo
    HAVING COUNT(c.id) > 0
    ORDER BY ingresos DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `, [...params, limit, offset])

  return {
    medicos: result.rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    periodo
  }
})
