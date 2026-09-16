export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)

  const result = await pool.query(
    `SELECT clave, valor FROM configuracion_sistema
     WHERE clave = 'whatsapp_webhook_activo'`
  )

  return { activo: result.rows[0]?.valor === 'true' }
})
