import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
})

// POST - Asistente crea cita para un paciente
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user
  try {
    const jwt = await import('jsonwebtoken')
    user = jwt.default.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  if (user.tipo !== 'asistente' && user.tipo !== 'admin') {
    throw createError({ statusCode: 403, message: 'Solo asistentes y administradores pueden crear citas' })
  }

  const body = await readBody(event)
  const { id_paciente, id_medico, fecha_hora, notas_paciente, notas_asistente } = body

  if (!id_paciente || !id_medico || !fecha_hora) {
    throw createError({ statusCode: 400, message: 'Paciente, médico y fecha/hora son requeridos' })
  }

  // Verify doctor exists and is active
  const medico = await pool.query('SELECT id, nombre, apellido FROM medicos WHERE id = $1 AND activo = true', [id_medico])
  if (medico.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Médico no encontrado o inactivo' })
  }

  // Verify patient exists
  const paciente = await pool.query('SELECT id, nombre, apellido FROM pacientes WHERE id = $1', [id_paciente])
  if (paciente.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Paciente no encontrado' })
  }

  // Check for scheduling conflicts
  const conflicto = await pool.query(
    `SELECT id FROM citas WHERE id_medico = $1 AND fecha_hora = $2 AND estado NOT IN ('cancelada', 'no_asistida')`,
    [id_medico, fecha_hora]
  )
  if (conflicto.rows.length > 0) {
    throw createError({ statusCode: 409, message: 'El médico ya tiene una cita agendada en esa fecha y hora' })
  }

  // Create the cita
  const result = await pool.query(
    `INSERT INTO citas (id_paciente, id_medico, fecha_hora, notas_paciente, notas_asistente, asistente_id, estado)
     VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')
     RETURNING *`,
    [id_paciente, id_medico, fecha_hora, notas_paciente || null, notas_asistente || null, user.id]
  )

  const cita = result.rows[0]

  // Log in bitácora
  await pool.query(
    `INSERT INTO citas_bitacora (id_cita, id_usuario, tipo_usuario, accion, estado_nuevo, descripcion, created_at)
     VALUES ($1, $2, 'asistente', 'creacion', 'pendiente', $3, NOW())`,
    [cita.id, user.id, `Cita creada por asistente. Paciente: ${paciente.rows[0].nombre} ${paciente.rows[0].apellido}. Médico: ${medico.rows[0].nombre} ${medico.rows[0].apellido}`]
  )

  return { cita }
})
