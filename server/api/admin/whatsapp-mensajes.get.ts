import { verifyAdminToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  await verifyAdminToken(event)

  const query = getQuery(event)
  const telefono = query.telefono as string

  if (!telefono) {
    throw createError({ statusCode: 400, message: 'Teléfono requerido' })
  }

  const mensajes = await pool.query(
    `SELECT * FROM whatsapp_mensajes_log
     WHERE telefono = $1
     ORDER BY created_at ASC
     LIMIT 200`,
    [telefono]
  )

  const conversacion = await pool.query(
    `SELECT * FROM whatsapp_conversaciones WHERE telefono = $1`,
    [telefono]
  )

  return {
    mensajes: mensajes.rows,
    conversacion: conversacion.rows[0] || null,
  }
})
