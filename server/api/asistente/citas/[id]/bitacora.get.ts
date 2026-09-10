const pool = getPool()

// GET - Bitácora de una cita específica
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user
  try {
    const jwt = await import('jsonwebtoken')
    user = jwt.default.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const { id } = getRouterParams(event)

  // Get cita details
  const cita = await pool.query(
    `SELECT c.*,
       p.nombre as paciente_nombre, p.apellido as paciente_apellido, p.telefono as paciente_telefono,
       m.nombre as medico_nombre, m.apellido as medico_apellido, m.whatsapp as medico_whatsapp
     FROM citas c
     JOIN pacientes p ON p.id = c.id_paciente
     JOIN medicos m ON m.id = c.id_medico
     WHERE c.id = $1`,
    [id]
  )

  if (cita.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Cita no encontrada' })
  }

  // Get bitácora
  const bitacora = await pool.query(
    `SELECT b.*, a.nombre as asistente_nombre, a.apellido as asistente_apellido
     FROM citas_bitacora b
     LEFT JOIN asistentes a ON a.id = b.id_usuario
     WHERE b.id_cita = $1
     ORDER BY b.created_at ASC`,
    [id]
  )

  // Get WhatsApp messages
  const mensajes = await pool.query(
    `SELECT w.*, a.nombre as asistente_nombre, a.apellido as asistente_apellido
     FROM whatsapp_mensajes w
     LEFT JOIN asistentes a ON a.id = w.registrado_por
     WHERE w.id_cita = $1
     ORDER BY w.created_at ASC`,
    [id]
  )

  return {
    cita: cita.rows[0],
    bitacora: bitacora.rows,
    mensajes_whatsapp: mensajes.rows,
  }
})
