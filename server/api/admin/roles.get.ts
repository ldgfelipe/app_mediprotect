export default defineEventHandler(async (event) => {
  const _user = verifyAdminToken(event)

  const pool = useDbPool(event)
  const result = await pool.query('SELECT id, nombre FROM roles ORDER BY id')
  return { roles: result.rows }
})
