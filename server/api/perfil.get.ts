export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const path = (query.path as string || '').trim()

  if (!path) {
    throw createError({ statusCode: 400, message: 'Parámetro "path" requerido. Ejemplo: /perfil-dr-erasmo-aaron-vega' })
  }

  const pool = useDbPool(event)

  const result = await pool.query(`
    SELECT
      m.id, m.slug, m.titulo, m.nombre, m.apellido, m.foto_url, m.bio,
      m.subespecialidad, m.cedula_profesional, m.cedula_especialidad,
      m.universidad, m.frase_inspiradora, m.whatsapp,
      m.precio_regular, m.precio_miembro, m.score_confianza, m.destacado,
      m.consultorio_direccion, m.consultorio_ciudad, m.consultorio_estado,
      m.horario_atencion, m.servicios, m.idiomas, m.formacion_academica,
      m.informacion_consulta, m.perfil_url,
      e.id as especialidad_id, e.slug as especialidad_slug,
      e.nombre as especialidad_nombre, e.icono as especialidad_icono,
      c.id as centro_id, c.nombre as centro_nombre,
      c.direccion as centro_direccion, c.ciudad as centro_ciudad,
      c.estado as centro_estado, c.telefono as centro_telefono,
      COALESCE(
        (SELECT json_agg(json_build_object(
          'id', me.especialidad_id,
          'slug', e2.slug,
          'nombre', e2.nombre
        ))
        FROM medico_especialidades me
        JOIN especialidades e2 ON e2.id = me.especialidad_id
        WHERE me.medico_id = m.id),
        '[]'::json
      ) as especialidades_adicionales
    FROM medicos m
    JOIN especialidades e ON e.id = m.id_especialidad
    LEFT JOIN centros_medicos c ON c.id = m.centro_id
    WHERE m.perfil_url_path = $1 AND m.activo = true
  `, [path])

  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Médico no encontrado para esa URL' })
  }

  const r = result.rows[0]

  return {
    medico: {
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
      precio_regular: r.precio_regular ? Number(r.precio_regular) : null,
      precio_miembro: r.precio_miembro ? Number(r.precio_miembro) : null,
      score_confianza: Number(r.score_confianza),
      destacado: r.destacado,
      direccion: r.consultorio_direccion,
      ciudad: r.consultorio_ciudad,
      estado: r.consultorio_estado,
      horario_atencion: r.horario_atencion,
      servicios: r.servicios || [],
      idiomas: r.idiomas || [],
      formacion_academica: r.formacion_academica || [],
      informacion_consulta: r.informacion_consulta || [],
      perfil_url: r.perfil_url,
      especialidad: {
        id: r.especialidad_id,
        slug: r.especialidad_slug,
        nombre: r.especialidad_nombre,
        icono: r.especialidad_icono,
      },
      centro: r.centro_id ? {
        id: r.centro_id,
        nombre: r.centro_nombre,
        direccion: r.centro_direccion,
        ciudad: r.centro_ciudad,
        estado: r.centro_estado,
        telefono: r.centro_telefono,
      } : null,
      especialidades_adicionales: r.especialidades_adicionales || [],
    }
  }
})
