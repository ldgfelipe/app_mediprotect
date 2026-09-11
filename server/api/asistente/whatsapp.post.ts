// POST - Asistente registra mensaje de WhatsApp
export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user
  try {
    const jwt = await import('jsonwebtoken')
    user = jwt.default.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  if (user.tipo?.toLowerCase() !== 'asistente' && user.tipo?.toLowerCase() !== 'admin') {
    throw createError({ statusCode: 403, message: 'No autorizado' })
  }

  const body = await readBody(event)
  const { id_cita, direccion, remitente, destinatario, telefono, mensaje } = body

  if (!direccion || !mensaje) {
    throw createError({ statusCode: 400, message: 'Dirección y mensaje son requeridos' })
  }

  if (!['saliente', 'entrante'].includes(direccion)) {
    throw createError({ statusCode: 400, message: 'Dirección debe ser "saliente" o "entrante"' })
  }

  const result = await pool.query(
    `INSERT INTO whatsapp_mensajes (id_cita, id_asistente, direccion, remitente, destinatario, telefono, mensaje, registrado_por, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $2, NOW())
     RETURNING *`,
    [id_cita || null, user.id, direccion, remitente || null, destinatario || null, telefono || null, mensaje]
  )

  return { mensaje_whatsapp: result.rows[0] }
})
