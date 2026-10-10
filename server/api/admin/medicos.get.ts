
export default defineEventHandler(async (event) => {
const _user = verifyAdminOrAsistenteToken(event)

  const pool = await useDbPool(event)
  const buscar = getQuery(event).buscar as string | undefined

  let query = `
    SELECT m.id, m.nombre, m.apellido, m.apellido_paterno, m.apellido_materno, m.email, m.telefono, m.cedula_profesional, m.titulo, m.foto_url, m.consultorio_ciudad, m.precio_regular, m.precio_miembro, m.usuario, e.nombre as especialidad_nombre, m.activo, m.created_at, m.curp, m.codigo_postal, m.colonia, m.rfc, m.hospital_consultorio, m.tipo_consulta, m.consultorio_estado, m.bio, m.email_confirmado, m.telefono_confirmado, m.perfil_url_path, m.slug
    FROM medicos m LEFT JOIN especialidades e ON m.id_especialidad = e.id
  `
  const params: any[] = []

  if (buscar && buscar.length >= 2) {
    query += ` WHERE (m.nombre ILIKE $1 OR m.apellido ILIKE $1 OR m.email ILIKE $1 OR m.usuario ILIKE $1)`
    params.push(`%${buscar}%`)
  }

  query += ' ORDER BY m.created_at DESC LIMIT 20'

  const result = await pool.query(query, params)
  return { medicos: result.rows }
})
