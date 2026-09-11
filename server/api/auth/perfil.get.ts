import { verifyToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  try {
  const decoded = verifyToken(event)
  const pool = useDbPool(event)
  const { id, tipo 
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err?.message || 'Error interno del servidor' })
  }} = decoded

  if (tipo === 'medico') {
    const result = await pool.query(
      `SELECT m.id, m.nombre, m.apellido, m.email, m.email_confirmado, m.telefono, m.telefono_confirmado, m.foto_url, m.cedula_profesional, m.consultorio_direccion, m.consultorio_ciudad, m.consultorio_estado, m.bio, m.created_at, m.apellido_paterno, m.apellido_materno, m.rfc, m.hospital_consultorio, m.tipo_consulta, m.curp, m.codigo_postal, m.colonia, m.comision_tipo, COALESCE(m.estudios, '[]'::jsonb) as estudios, e.nombre as especialidad
       FROM medicos m
       LEFT JOIN especialidades e ON m.id_especialidad = e.id WHERE m.id = $1`, [id]
    )
    if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'No encontrado' })
    return { usuario: { ...result.rows[0], tipo } }
  }

  const result = await pool.query(
    `SELECT id, nombre, apellido, email, email_confirmado, telefono, telefono_confirmado, fecha_nacimiento, genero, direccion, ciudad,
     curp, estado_civil, ocupacion, como_nos_conociste,
     beneficiario_nombre, beneficiario_parentesco, beneficiario_telefono,
     identificacion_tipo, identificacion_numero, acepta_seguro, plan_contratado,
     acepta_terminos, acepta_marketing, created_at
     FROM pacientes WHERE id = $1`, [id]
  )
  if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'No encontrado' })
  return { usuario: { ...result.rows[0], tipo } }
})
