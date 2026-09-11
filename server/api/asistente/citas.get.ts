// GET - Todas las citas para el asistente/admin
export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user
  try {
    const jwt = await import('jsonwebtoken')
    user = jwt.default.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  if (user.tipo?.toLowerCase() !== 'asistente' && user.tipo?.toLowerCase() !== 'admin') {
    throw createError({ statusCode: 403, message: 'No autorizado' })
  }

  const query = getQuery(event)
  const { estado, search, fecha_desde, fecha_hasta } = query

  let sql = `
    SELECT c.*,
      p.nombre as paciente_nombre, p.apellido as paciente_apellido, p.telefono as paciente_telefono,
      COALESCE(m.nombre, '') as medico_nombre, COALESCE(m.apellido, '') as medico_apellido,
      m.whatsapp as medico_whatsapp,
      a.nombre as asistente_nombre, a.apellido as asistente_apellido
    FROM citas c
    JOIN pacientes p ON p.id = c.id_paciente
    LEFT JOIN medicos m ON m.id = c.id_medico
    LEFT JOIN asistentes a ON a.id = c.asistente_id
    WHERE 1=1
  `
  const params = []
  let paramIdx = 1

  if (estado) {
    sql += ` AND c.estado = $${paramIdx}`
    params.push(estado)
    paramIdx++
  }

  if (search) {
    sql += ` AND (p.nombre ILIKE $${paramIdx} OR p.apellido ILIKE $${paramIdx} OR m.nombre ILIKE $${paramIdx} OR m.apellido ILIKE $${paramIdx} OR p.id::text ILIKE $${paramIdx} OR m.id::text ILIKE $${paramIdx} OR c.id_paciente::text ILIKE $${paramIdx} OR c.id_medico::text ILIKE $${paramIdx})`
    params.push(`%${search}%`)
    paramIdx++
  }

  if (fecha_desde) {
    sql += ` AND c.fecha_hora >= $${paramIdx}`
    params.push(fecha_desde)
    paramIdx++
  }

  if (fecha_hasta) {
    sql += ` AND c.fecha_hora <= $${paramIdx}`
    params.push(fecha_hasta)
    paramIdx++
  }

  sql += ' ORDER BY c.fecha_hora DESC'

  const result = await pool.query(sql, params)

  return { citas: result.rows }
})
