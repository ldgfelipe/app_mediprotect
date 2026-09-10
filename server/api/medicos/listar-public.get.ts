export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const termino = (query.q as string || '').trim().toLowerCase()

  const pool = useDbPool(event)

  let sql = `
    SELECT m.id, m.nombre, m.apellido, m.titulo, m.foto_url, m.ciudad,
           m.precio_regular, m.precio_miembro, m.slug,
           e.nombre as especialidad_nombre, e.color as especialidad_color
    FROM medicos m
    LEFT JOIN especialidades e ON m.id_especialidad = e.id
    WHERE m.activo = true
  `
  const params: any[] = []

  if (termino && termino.length >= 2) {
    params.push(termino)
    sql += `
      AND (
        LOWER(m.nombre) ILIKE '%' || $1 || '%'
        OR LOWER(m.apellido) ILIKE '%' || $1 || '%'
        OR LOWER(CONCAT(COALESCE(m.nombre, ''), ' ', COALESCE(m.apellido, ''))) ILIKE '%' || $1 || '%'
        OR LOWER(e.nombre) ILIKE '%' || $1 || '%'
      )
    `
  }

  sql += ' ORDER BY m.nombre, m.apellido LIMIT 50'

  const result = await pool.query(sql, params)
  return { medicos: result.rows }
})
