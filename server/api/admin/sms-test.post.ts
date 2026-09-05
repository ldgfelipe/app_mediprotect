import jwt from 'jsonwebtoken'
import { enviarSms } from '../../utils/sms.js'
import { getSmsConfig } from '../../utils/sms.js'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user: any
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch {
    throw createError({ statusCode: 401, message: 'Token invalido' })
  }

  if (user.tipo !== 'admin' && user.rol !== 'admin') {
    throw createError({ statusCode: 403, message: 'Solo administradores pueden enviar SMS de prueba' })
  }

  const body = await readBody(event)
  const { telefono, mensaje } = body

  if (!telefono) {
    throw createError({ statusCode: 400, message: 'El telefono es requerido' })
  }

  const telefonoLimpio = telefono.replace(/[^0-9+]/g, '')
  if (telefonoLimpio.length < 10) {
    throw createError({ statusCode: 400, message: 'El telefono debe tener al menos 10 digitos' })
  }

  const config = await getSmsConfig()
  if (!config.account_sid || !config.auth_token || !config.from_number) {
    throw createError({ statusCode: 503, message: 'SMS no configurado. Completa Account SID, Auth Token y numero en la configuracion.' })
  }

  const mensajeFinal = mensaje || 'MediProtect: SMS de prueba - configuracion correcta'
  const result = await enviarSms(telefonoLimpio, mensajeFinal)

  if (!result.success) {
    throw createError({ statusCode: 500, message: result.error || 'Error enviando SMS' })
  }

  return {
    success: true,
    mensaje: 'SMS de prueba enviado correctamente',
    sid: result.sid,
    telefono: telefonoLimpio
  }
})
