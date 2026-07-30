export default defineEventHandler(async (event) => {
  const pool = getPool()
  const result = await pool.query(
    `SELECT COUNT(*) as total
     FROM configuracion_sistema
     WHERE categoria = 'pagos' AND clave LIKE '%_api_key' AND valor IS NOT NULL AND valor != ''`
  )
  const configurado = parseInt(result.rows[0].total) > 0
  return { configurado }
})
