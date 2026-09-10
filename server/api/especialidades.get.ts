export default defineEventHandler(async (event) => {
  const pool = useDbPool(event)
  const result = await pool.query('SELECT * FROM especialidades ORDER BY nombre')
  return { especialidades: result.rows }
})
