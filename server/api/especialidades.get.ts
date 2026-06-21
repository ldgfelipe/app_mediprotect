export default defineEventHandler(async () => {
  const pool = getPool()
  const result = await pool.query('SELECT * FROM especialidades ORDER BY nombre')
  return { especialidades: result.rows }
})
