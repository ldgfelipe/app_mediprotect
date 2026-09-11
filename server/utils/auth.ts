import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026'

export function verifyToken(event: any) {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as { id: string; email: string; tipo: string }
  } catch {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }
}

export function verifyAdminToken(event: any) {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; tipo: string }
    if (decoded.tipo !== 'admin') {
      throw createError({ statusCode: 403, message: 'Acceso denegado' })
    }
    return decoded
  } catch (e: any) {
    if (e?.statusCode === 403) throw e
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }
}

export function verifyAdminOrAsistenteToken(event: any) {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; tipo: string }
    if (!['admin', 'asistente'].includes(decoded.tipo)) {
      throw createError({ statusCode: 403, message: 'Acceso denegado' })
    }
    return decoded
  } catch (e: any) {
    if (e?.statusCode === 403) throw e
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }
}
