import jwt from 'jsonwebtoken'

const SECRETO = () => process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026'
const VIDA = () => process.env.JWT_EXPIRES_IN || '7d'

/**
 * Renueva el token de sesion del admin sin cerrar la sesion.
 * El frontend lo llama en segundo plano; si el token ya expiro responde 401
 * para que el navegador limpie la cookie y vuelva al login.
 */
export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })

  let payload: any
  try {
    payload = jwt.verify(token, SECRETO())
  } catch (err: any) {
    if (err?.name === 'TokenExpiredError') {
      throw createError({ statusCode: 401, message: 'Tu sesion expiro, vuelve a iniciar sesion' })
    }
    throw createError({ statusCode: 401, message: 'Token invalido' })
  }

  const { iat, exp, ...claims } = payload
  const nuevo = jwt.sign(claims, SECRETO(), { expiresIn: VIDA() })

  return { ok: true, token: nuevo, expira: VIDA() }
})
