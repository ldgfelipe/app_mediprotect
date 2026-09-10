import jwt from 'jsonwebtoken'
import crypto from 'crypto'

function verifyAdmin(event: any) {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export default defineEventHandler(async (event) => {
  verifyAdmin(event)
  const pool = useDbPool()
  const body = await readBody(event)

  const { nombre, permisos, user_id, user_tipo } = body
  if (!nombre) throw createError({ statusCode: 400, message: 'Nombre requerido' })
  if (!user_id) throw createError({ statusCode: 400, message: 'Usuario requerido' })

  const rawToken = `mp_${crypto.randomBytes(32).toString('hex')}`
  const tokenHash = hashToken(rawToken)
  const tokenPreview = rawToken.substring(0, 12) + '...'

  const result = await pool.query(
    `INSERT INTO api_tokens (nombre, token_hash, token_preview, user_id, user_tipo, permisos, activo)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING id, nombre, token_preview, permisos, activo, created_at`,
    [nombre, tokenHash, tokenPreview, user_id, user_tipo || 'paciente', JSON.stringify(permisos || [])]
  )

  return { token: rawToken, registro: result.rows[0] }
})