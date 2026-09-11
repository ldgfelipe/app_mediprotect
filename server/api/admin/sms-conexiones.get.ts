
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const pool = useDbPool(event)
  const result = await pool.query(
    'SELECT id, nombre, proveedor, account_sid, auth_token, api_url, metodo, from_number, modo, activa, preferida, prioridad, descripcion, created_at, updated_at FROM sms_conexiones ORDER BY prioridad ASC, created_at ASC'
  )

  return { conexiones: result.rows.map((c: any) => ({ ...c, auth_token: c.auth_token ? '********' : '' })) }
})
