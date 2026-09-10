import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const pool = useDbPool()
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
  const params = [fechaInicio, fechaFin]
  let paramIdx = 3

  if (search) {
    where += ` AND (m.nombre ILIKE $${paramIdx} OR m.apellido ILIKE $${paramIdx} OR e.nombre ILIKE $${paramIdx})`
    params.push(`%${search}%`)
    paramIdx++
  }

  const totalResult = await pool.query(`
    SELECT COUNT(DISTINCT m.id)
    FROM medicos m
    LEFT JOIN citas c ON c.id_medico = m.id ${where.replace('c.fecha_hora', 'c.fecha_hora')}
    GROUP BY m.id
    HAVING COUNT(c.id) > 0
  `, params)
  const total = parseInt(totalResult.rows[0]?.count || '0')

  const result = await pool.query(`
    SELECT 
      m.id, m.nombre, m.apellido, m.precio_regular, m.precio_miembro,
      e.nombre as especialidad_nombre,
      COUNT(c.id) as total_citas,
      COUNT(c.id) FILTER (WHERE c.estado IN ('confirmada', 'asistida')) as citas_confirmadas,
      COALESCE(SUM(c.costo_consulta) FILTER (WHERE c.estado IN ('confirmada', 'asistida')), 0) as ingresos,
      COALESCE(SUM(c.costo_consulta * 0.15) FILTER (WHERE c.estado IN ('confirmada', 'asistida')), 0) as comision
    FROM medicos m
    LEFT JOIN especialidades e ON e.id = m.id_especialidad
    LEFT JOIN citas c ON c.id_medico = m.id ${where}
    GROUP BY m.id, m.nombre, m.apellido, m.precio_regular, m.precio_miembro, e.nombre
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