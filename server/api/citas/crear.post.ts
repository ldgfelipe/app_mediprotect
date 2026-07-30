import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user
  try {
    user = jwt.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  if (user.tipo !== 'paciente') {
    throw createError({ statusCode: 403, message: 'Solo pacientes pueden crear citas' })
  }

  const body = await readBody(event)
  const { medico_nombre, id_medico, fecha_hora, notas_paciente } = body

  if (!medico_nombre && !id_medico) {
    throw createError({ statusCode: 400, message: 'Se requiere nombre o ID del médico' })
  }

  const pool = getPool()

  let medicoData = null
  if (id_medico) {
    const medico = await pool.query('SELECT id, nombre, apellido FROM medicos WHERE id = $1 AND activo = true', [id_medico])
    if (medico.rows.length > 0) medicoData = medico.rows[0]
  }

  const notasConMedico = medico_nombre
    ? `${notas_paciente || ''}\n[Médico: ${medico_nombre}]`.trim()
    : notas_paciente || null

  const result = await pool.query(
    `INSERT INTO citas (id_paciente, id_medico, fecha_hora, notas_paciente, estado)
     VALUES ($1, $2, $3, $4, 'pendiente')
     RETURNING *`,
    [user.id, id_medico || null, fecha_hora || null, notasConMedico]
  )

  const cita = result.rows[0]

  const paciente = await pool.query('SELECT nombre, apellido FROM pacientes WHERE id = $1', [user.id])

  await pool.query(
    `INSERT INTO citas_bitacora (id_cita, id_usuario, tipo_usuario, accion, estado_nuevo, descripcion, created_at)
     VALUES ($1, $2, 'paciente', 'creacion', 'pendiente', $3, NOW())`,
    [cita.id, user.id, `Cita creada por paciente. Médico: ${medico_nombre || 'No especificado'}`]
  )

  return { cita }
})
