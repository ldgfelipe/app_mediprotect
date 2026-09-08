import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const pool = getPool()
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