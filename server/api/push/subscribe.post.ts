import { useDbPool } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool()
  const decoded = verifyToken(event)

  const body = await readBody(event)
  const { endpoint, p256dh, auth } = body

  if (!endpoint || !p256dh || !auth) {
    throw createError({ statusCode: 400, message: 'Datos de suscripción incompletos' })
  }

  await pool.query(
    `INSERT INTO push_subscriptions (user_id, user_tipo, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, user_tipo = $2, p256dh = $4, auth = $5`,
    [decoded.id, decoded.tipo, endpoint, p256dh, auth]
  )

  return { ok: true }
})
