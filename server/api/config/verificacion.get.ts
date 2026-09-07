export default defineEventHandler(async (event) => {
  const pool = getPool()
  const result = await pool.query(
    "SELECT clave, valor FROM configuracion_sistema WHERE clave IN ('require_phone_verification', 'require_email_verification')"
  )
  const map: Record<string, string> = {}
  for (const row of result.rows) {
    map[row.clave] = row.valor
  }
  return {
    requirePhoneVerification: map['require_phone_verification'] !== 'false',
    requireEmailVerification: map['require_email_verification'] !== 'false',
  }
})
