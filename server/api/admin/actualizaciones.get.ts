
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const pool = await useDbPool(event)
  const result = await pool.query(
    'SELECT * FROM actualizaciones_sistema ORDER BY created_at DESC LIMIT 50'
  )
  return { actualizaciones: result.rows }
})
