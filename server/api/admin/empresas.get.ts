
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const pool = useDbPool(event)
  const result = await pool.query('SELECT * FROM empresas ORDER BY created_at DESC')
  return { empresas: result.rows }
})

