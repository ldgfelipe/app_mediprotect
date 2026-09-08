import jwt from 'jsonwebtoken'
import { probarSmtp } from '../../utils/email.js'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const body = await readBody(event)
  const to = (body?.to || '').trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw createError({ statusCode: 400, message: 'Correo destino no válido' })
  }

  try {
    await probarSmtp(to)
  } catch (e: any) {
    console.error('Error en prueba SMTP:', e.message)
    throw createError({ statusCode: 500, message: `No se pudo enviar el correo de prueba: ${e.message}` })
  }

  return { success: true, mensaje: `Correo de prueba enviado a ${to}` }
})