
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const pool = await useDbPool(event)
  const result = await pool.query(
    'SELECT * FROM tareas_pendientes ORDER BY CASE prioridad WHEN \'alta\' THEN 1 WHEN \'media\' THEN 2 WHEN \'baja\' THEN 3 END, created_at DESC LIMIT 100'
  )
  return { tareas: result.rows }
})
