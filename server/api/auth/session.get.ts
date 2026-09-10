import jwt from 'jsonwebtoken'
import crypto from 'crypto'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { autenticado: false }
  }

  const bearerToken = authHeader.split(' ')[1]
  const pool = useDbPool()

  // Try JWT first
  try {
    const payload = jwt.verify(
      bearerToken,
      process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026'
    ) as { id: string; email: string; tipo: string }

    const table = payload.tipo === 'medico' ? 'medicos' : 'pacientes'
    const result = await pool.query(
      `SELECT id, nombre, apellido, email, telefono FROM ${table} WHERE id = $1`,
      [payload.id]
    )

    if (result.rows.length === 0) {
      return { autenticado: false }
    }

    const user = result.rows[0]
    return {
      autenticado: true,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        telefono: user.telefono,
        tipo: payload.tipo,
      }
    }
  } catch {
    // JWT failed, try API token
  }

  // Try API token
  try {
    const tokenHash = hashToken(bearerToken)
    const result = await pool.query(
      `SELECT id, user_id, user_tipo, permisos, activo FROM api_tokens WHERE token_hash = $1`,
      [tokenHash]
    )

    if (result.rows.length === 0 || !result.rows[0].activo) {
      return { autenticado: false }
    }

    const apiToken = result.rows[0]

    // Update last use
    await pool.query(`UPDATE api_tokens SET ultimo_uso = NOW() WHERE id = $1`, [apiToken.id])

    // Fetch user data
    const table = apiToken.user_tipo === 'medico' ? 'medicos' : 'pacientes'
    const userResult = await pool.query(
      `SELECT id, nombre, apellido, email, telefono FROM ${table} WHERE id = $1`,
      [apiToken.user_id]
    )

    if (userResult.rows.length === 0) {
      return { autenticado: false }
    }

    const user = userResult.rows[0]
    return {
      autenticado: true,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        telefono: user.telefono,
        tipo: apiToken.user_tipo,
      }
    }
  } catch {
    return { autenticado: false }
  }
})
