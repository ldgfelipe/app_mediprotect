
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const pool = await useDbPool(event)
  const id = getRouterParam(event, 'id')

  const result = await pool.query(`
    SELECT 
      m.id, m.nombre, m.apellido, m.email, m.telefono, m.cedula_profesional, m.titulo,
      m.foto_url, m.consultorio_direccion, m.consultorio_ciudad, m.consultorio_estado,
      m.bio, m.activo, m.created_at, m.precio_regular, m.precio_miembro,
      m.horario_atencion, m.idiomas, m.servicios, m.certificaciones, m.usuario,
      e.nombre as especialidad_nombre,
      COUNT(c.id) FILTER (WHERE c.estado IN ('confirmada', 'asistida')) as citas_confirmadas
    FROM medicos m
    LEFT JOIN especialidades e ON m.id_especialidad = e.id
    LEFT JOIN citas c ON c.id_medico = m.id AND c.estado IN ('confirmada', 'asistida')
    WHERE m.id = $1
    GROUP BY m.id, e.nombre
  `, [id])

  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Médico no encontrado' })
  }

  return { medico: result.rows[0] }
})