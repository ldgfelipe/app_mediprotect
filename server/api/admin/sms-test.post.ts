import { enviarSms, enviarSmsConId } from '../../utils/sms.js'

export default defineEventHandler(async (event) => {
  const user = verifyAdminToken(event)

  const body = await readBody(event)
  const { telefono, mensaje, conexion_id } = body

  if (!telefono) {
    throw createError({ statusCode: 400, message: 'El telefono es requerido' })
  }

  const telefonoLimpio = telefono.replace(/[^0-9+]/g, '')
  if (telefonoLimpio.length < 10) {
    throw createError({ statusCode: 400, message: 'El telefono debe tener al menos 10 digitos' })
  }

  const mensajeFinal = mensaje || 'MediProtect: SMS de prueba - configuracion correcta'

  let result
  if (conexion_id) {
    result = await enviarSmsConId(conexion_id, telefonoLimpio, mensajeFinal)
  } else {
    result = await enviarSms(telefonoLimpio, mensajeFinal)
  }

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
