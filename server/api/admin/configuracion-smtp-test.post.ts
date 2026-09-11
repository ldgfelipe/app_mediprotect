import { probarSmtp } from '../../utils/email.js'

export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

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