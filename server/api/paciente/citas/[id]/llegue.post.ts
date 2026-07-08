import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
})

// POST - Paciente confirma que ya llegó a su cita
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user
  try {
    const jwt = await import('jsonwebtoken')
    user = jwt.default.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  if (user.tipo !== 'paciente') {
    throw createError({ statusCode: 403, message: 'Solo pacientes pueden confirmar llegada' })
  }

  const { id } = getRouterParams(event)

  // Verify cita belongs to this patient
  const current = await pool.query(
    'SELECT * FROM citas WHERE id = $1 AND id_paciente = $2',
    [id, user.id]
  )
  if (current.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Cita no encontrada' })
  }

  const cita = current.rows[0
  ]

  if (!['confirmada', 'pendiente'].includes(cita.estado)) {
    throw createError({ statusCode: 400, message: `No se puede confirmar llegada en estado: ${cita.estado}` })
  }

  await pool.query(
    `UPDATE citas SET estado = 'paciente_llego', paciente_llego_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [id]
  )

  // Log
  await pool.query(
    `INSERT INTO citas_bitacora (id_cita, id_usuario, tipo_usuario, accion, estado_anterior, estado_nuevo, descripcion, created_at)
     VALUES ($1, $2, 'paciente', 'llegada_paciente', $3, 'paciente_llego', 'Paciente confirmó llegada a la cita', NOW())`,
    [id, user.id, cita.estado]
  )

  return { ok: true, mensaje: 'Llegada confirmada. El asistente será notificado.' }
})
