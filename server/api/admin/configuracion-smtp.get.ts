
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const pool = await useDbPool(event)
  const result = await pool.query(
    "SELECT clave, valor, tipo FROM configuracion_sistema WHERE categoria = 'smtp'"
  )

  const m: Record<string, string> = {}
  for (const row of result.rows) m[row.clave] = row.valor

  const dbConfig = {
    enabled: m.smtp_enabled !== 'false',
    host: m.smtp_host || '',
    port: m.smtp_port || '465',
    user: m.smtp_user || '',
    from: m.smtp_from || '',
    pass_set: !!m.smtp_pass,
  }

  const envFallback = {
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: process.env.SMTP_PORT || '465',
    user: process.env.SMTP_USER || 'b70b6d001@smtp-brevo.com',
    from: process.env.SMTP_FROM || 'agente@mediprotect.com.mx',
    pass_set: !!process.env.SMTP_PASS,
  }

  return {
    configuracion: dbConfig,
    env_fallback: envFallback,
    en_uso: dbConfig.host ? 'configuracion' : 'env',
  }
})