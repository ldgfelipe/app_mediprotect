
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const pool = await useDbPool(event)
  const result = await pool.query(
    'SELECT id, telefono, descripcion, verificado_por, created_at FROM telefonos_verificados ORDER BY created_at DESC'
  )

  return { telefonos: result.rows }
})
