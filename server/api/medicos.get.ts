export default defineEventHandler(async (event) => {
  try {
  const query = getQuery(event)
  const pool = await useDbPool(event)

  let sql = `
    SELECT m.id, m.nombre, m.apellido, m.titulo, m.cedula_profesional, m.consultorio_direccion,
           m.consultorio_ciudad, m.consultorio_estado, m.bio, m.foto_url, m.score_confianza,
           e.nombre as especialidad_nombre, e.id as especialidad_id,
           m.subespecialidad
    FROM medicos m
    JOIN especialidades e ON e.id = m.id_especialidad
    WHERE m.activo = true
  `
  const params: any[] = []
  let idx = 1

  if (query.especialidad) {
    sql += ` AND e.id = $${idx++}`
    params.push(query.especialidad)
  
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err?.message || 'Error interno del servidor' })
  }}
  if (query.ciudad) {
    sql += ` AND LOWER(m.consultorio_ciudad) LIKE LOWER($${idx++})`
    params.push(`%${query.ciudad}%`)
  }
  if (query.estado) {
    sql += ` AND LOWER(m.consultorio_estado) LIKE LOWER($${idx++})`
    params.push(`%${query.estado}%`)
  }
  if (query.search) {
    sql += ` AND (LOWER(m.nombre) LIKE LOWER($${idx++}) OR LOWER(m.apellido) LIKE LOWER($${idx++}) OR LOWER(m.titulo) LIKE LOWER($${idx++}) OR LOWER(m.bio) LIKE LOWER($${idx++}) OR LOWER(CONCAT(m.titulo, ' ', m.nombre, ' ', m.apellido)) LIKE LOWER($${idx++}) OR m.id::text ILIKE $${idx++})`
    const s = `%${query.search}%`
    params.push(s, s, s, s, s, s)
  }

  sql += ' ORDER BY m.score_confianza DESC, m.nombre ASC'

  const result = await pool.query(sql, params)
  return { medicos: result.rows }
})
