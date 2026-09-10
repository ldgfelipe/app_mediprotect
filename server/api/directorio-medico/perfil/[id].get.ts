export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const pool = useDbPool()

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID o slug requerido' })
  }

  // Support both UUID and slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  let sql = `
    SELECT
      m.id, m.slug, m.titulo, m.nombre, m.apellido, m.foto_url, m.bio,
      m.subespecialidad, m.cedula_profesional, m.cedula_especialidad, m.universidad,
      m.frase_inspiradora, m.whatsapp, m.telefono, m.email,
      m.precio_regular, m.precio_miembro,
      m.score_confianza, m.destacado,
      m.consultorio_direccion, m.consultorio_ciudad as ciudad, m.consultorio_estado as estado,
      m.horario_atencion, m.servicios, m.idiomas, m.formacion_academica,
      m.informacion_consulta, m.perfil_url, m.perfil_url_path,
      m.created_at,
      e.id as especialidad_id, e.slug as especialidad_slug, e.nombre as especialidad_nombre,
      e.icono as especialidad_icono, e.color as especialidad_color,
      c.id as centro_id, c.nombre as centro_nombre, c.direccion as centro_direccion,
      c.ciudad as centro_ciudad, c.estado as centro_estado, c.telefono as centro_telefono
    FROM medicos m
    JOIN especialidades e ON e.id = m.id_especialidad
    LEFT JOIN centros_medicos c ON c.id = m.centro_id
    WHERE m.activo = true AND ${isUuid ? 'm.id = $1' : 'm.slug = $1'}
  `

  const result = await pool.query(sql, [id])

  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Médico no encontrado' })
  }

  const r = result.rows[0]

  // Get additional specialties
  const espAdicionales = await pool.query(`
    SELECT e.id, e.slug, e.nombre, e.icono, e.color
    FROM medico_especialidades me
    JOIN especialidades e ON e.id = me.especialidad_id
    WHERE me.medico_id = $1
  `, [r.id])

  // Get services
  const servicios = await pool.query(`
    SELECT id, nombre, descripcion
    FROM servicios
    WHERE medico_id = $1
  `, [r.id])

  return {
    id: r.id,
    slug: r.slug,
    titulo: r.titulo,
    nombre: r.nombre,
    apellido: r.apellido,
    nombre_completo: `${r.titulo || ''} ${r.nombre} ${r.apellido}`.trim(),
    foto_url: r.foto_url,
    bio: r.bio,
    subespecialidad: r.subespecialidad,
    frase_inspiradora: r.frase_inspiradora,
    cedula_profesional: r.cedula_profesional,
    cedula_especialidad: r.cedula_especialidad,
    universidad: r.universidad,
    whatsapp: r.whatsapp,
    telefono: r.telefono,
    email: r.email,
    precio_regular: r.precio_regular ? Number(r.precio_regular) : null,
    precio_miembro: r.precio_miembro ? Number(r.precio_miembro) : null,
    score_confianza: r.score_confianza ? Number(r.score_confianza) : null,
    destacado: r.destacado,
    direccion: r.consultorio_direccion,
    ciudad: r.ciudad,
    estado: r.estado,
    horario_atencion: r.horario_atencion,
    idiomas: r.idiomas || [],
    formacion_academica: r.formacion_academica || [],
    informacion_consulta: r.informacion_consulta || [],
    perfil_url: r.perfil_url,
    perfil_url_path: r.perfil_url_path,
    created_at: r.created_at,
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
    servicios: servicios.rows,
    especialidades_adicionales: espAdicionales.rows,
  }
})
