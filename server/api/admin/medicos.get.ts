import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const pool = getPool()
  const result = await pool.query(`
    SELECT m.id, m.nombre, m.apellido, m.apellido_paterno, m.apellido_materno, m.email, m.telefono, m.cedula_profesional, m.titulo, m.foto_url, m.consultorio_ciudad, m.precio_regular, m.precio_miembro, m.usuario, e.nombre as especialidad_nombre, m.activo, m.created_at, m.curp, m.codigo_postal, m.colonia, m.rfc, m.hospital_consultorio, m.tipo_consulta, m.consultorio_estado, m.bio
    FROM medicos m LEFT JOIN especialidades e ON m.id_especialidad = e.id
    ORDER BY m.created_at DESC
  `)
  return { medicos: result.rows }
})
