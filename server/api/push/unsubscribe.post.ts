import { useDbPool } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool()
  const body = await readBody(event)
  const { endpoint } = body

  if (!endpoint) throw createError({ statusCode: 400, message: 'Endpoint requerido' })

  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint])
  return { ok: true }
})
