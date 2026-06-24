import jwt from 'jsonwebtoken'

export function verifyToken(event: any) {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }
  try {
    return jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'default_secret') as { id: string; email: string; tipo: string }
  } catch {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }
}
