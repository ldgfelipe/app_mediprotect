export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const pool = useDbPool(event)

  let sql = `
    SELECT
      m.id, m.slug, m.titulo, m.nombre, m.apellido, m.foto_url, m.bio as descripcion,
      m.subespecialidad, m.cedula_profesional, m.cedula_especialidad, m.universidad,
      m.frase_inspiradora, m.whatsapp, m.precio_regular, m.precio_miembro,
      m.score_confianza, m.destacado,
      m.consultorio_direccion, m.consultorio_ciudad as ciudad, m.consultorio_estado as estado,
      e.id as especialidad_id, e.slug as especialidad_slug, e.nombre as especialidad_nombre, e.icono as especialidad_icono, e.color as especialidad_color,
      c.id as centro_id, c.nombre as centro_nombre, c.direccion as centro_direccion,
      c.ciudad as centro_ciudad, c.estado as centro_estado, c.telefono as centro_telefono,
      COALESCE(
        (SELECT json_agg(json_build_object('id', s.id, 'nombre', s.nombre, 'descripcion', s.descripcion))
         FROM servicios s WHERE s.medico_id = m.id),
        '[]'::json
      ) as servicios,
      COALESCE(
        (SELECT json_agg(json_build_object('id', me.especialidad_id, 'slug', e2.slug, 'nombre', e2.nombre))
         FROM medico_especialidades me
         JOIN especialidades e2 ON e2.id = me.especialidad_id
         WHERE me.medico_id = m.id),
        '[]'::json
      ) as especialidades_adicionales
    FROM medicos m
    JOIN especialidades e ON e.id = m.id_especialidad
    LEFT JOIN centros_medicos c ON c.id = m.centro_id
    WHERE m.activo = true AND m.slug IS NOT NULL
  `
  const params: any[] = []
  let idx = 1

  if (query.especialidad) {
    sql += ` AND e.slug = $${idx++}`
    params.push(query.especialidad)
  }
  if (query.ciudad) {
    sql += ` AND LOWER(m.consultorio_ciudad) LIKE LOWER($${idx++})`
    params.push(`%${query.ciudad}%`)
  }
  if (query.estado) {
    sql += ` AND LOWER(m.consultorio_estado) LIKE LOWER($${idx++})`
    params.push(`%${query.estado}%`)
  }
  if (query.search) {
    sql += ` AND (LOWER(m.nombre || ' ' || m.apellido) LIKE LOWER($${idx++}) OR LOWER(m.bio) LIKE LOWER($${idx++}))`
    const s = `%${query.search}%`
    params.push(s, s)
  }
  if (query.destacado === 'true') {
    sql += ` AND m.destacado = true`
  }
  sql += ` ORDER BY m.destacado DESC, m.score_confianza DESC, m.nombre ASC`

  if (query.limite) {
    sql += ` LIMIT $${idx++}`
    params.push(Number(query.limite))
  } else {
    sql += ` LIMIT 100`
  }

  const result = await pool.query(sql, params)

  const medicos = result.rows.map((r: any) => ({
    id: r.id,
    slug: r.slug,
    titulo: r.titulo,
    nombre: r.nombre,
    apellido: r.apellido,
    nombre_completo: `${r.titulo || ''} ${r.nombre} ${r.apellido}`.trim(),
    foto_url: r.foto_url,
    descripcion: r.descripcion,
    subespecialidad: r.subespecialidad,
    frase_inspiradora: r.frase_inspiradora,
    cedula_profesional: r.cedula_profesional,
    cedula_especialidad: r.cedula_especialidad,
    universidad: r.universidad,
    whatsapp: r.whatsapp,
    precio_regular: r.precio_regular ? Number(r.precio_regular) : null,
    precio_miembro: r.precio_miembro ? Number(r.precio_miembro) : null,
    score_confianza: Number(r.score_confianza),
    destacado: r.destacado,
    direccion: r.consultorio_direccion,
    ciudad: r.ciudad,
    estado: r.estado,
    especialidad: {
      id: r.especialidad_id,
      slug: r.especialidad_slug,
      nombre: r.especialidad_nombre,
      icono: r.especialidad_icono,
      color: r.especialidad_color,
    },
    centro: r.centro_id ? {
      id: r.centro_id,
      nombre: r.centro_nombre,
      direccion: r.centro_direccion,
      ciudad: r.centro_ciudad,
      estado: r.centro_estado,
      telefono: r.centro_telefono,
    } : null,
    servicios: r.servicios || [],
    especialidades_adicionales: r.especialidades_adicionales || [],
  }))

  return { medicos, total: medicos.length }
})
