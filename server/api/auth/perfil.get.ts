import { verifyToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  const pool = getPool()
  const { id, tipo } = decoded

  if (tipo === 'medico') {
    const result = await pool.query(
      `SELECT m.id, m.nombre, m.apellido, m.email, m.telefono, m.fecha_nacimiento, m.genero, m.direccion, m.foto_url, m.cedula_profesional, m.consultorio_direccion, m.consultorio_ciudad, m.consultorio_estado, m.bio, m.created_at, e.nombre as especialidad
       FROM medicos m
       LEFT JOIN especialidades e ON m.id_especialidad = e.id WHERE m.id = $1`, [id]
    )
    if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'No encontrado' })
    return { usuario: result.rows[0] }
  }

  const result = await pool.query(
    `SELECT id, nombre, apellido, email, telefono, fecha_nacimiento, genero, direccion, ciudad,
     curp, estado_civil, ocupacion, como_nos_conociste,
     beneficiario_nombre, beneficiario_parentesco, beneficiario_telefono,
     identificacion_tipo, identificacion_numero, acepta_seguro, plan_contratado,
     acepta_terminos, acepta_marketing,
     COALESCE(estudios, '[]'::jsonb) as estudios, created_at
     FROM pacientes WHERE id = $1`, [id]
  )
  if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'No encontrado' })
  return { usuario: result.rows[0] }
})
