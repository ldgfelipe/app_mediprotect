import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { enviarSms, generarCodigoVerificacion, getSmsConfig } from '../../utils/sms.js'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'token') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user: any
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch {
    throw createError({ statusCode: 401, message: 'Token invalido' })
  }

  const body = await readBody(event)
  const { telefono, tipo } = body

  if (!telefono) {
    throw createError({ statusCode: 400, message: 'El telefono es requerido' })
  }

  const telefonoLimpio = telefono.replace(/[^0-9+]/g, '')
  if (telefonoLimpio.length < 10) {
    throw createError({ statusCode: 400, message: 'El telefono debe tener al menos 10 digitos' })
  }

  const tipoUsuario = tipo || user.tipo
  if (!['medico', 'paciente'].includes(tipoUsuario)) {
    throw createError({ statusCode: 400, message: 'Tipo invalido' })
  }

  const pool = getPool()

  // Verificar si el telefono esta en la lista de verificados por admin
  const telVerificado = await pool.query(
    'SELECT id FROM telefonos_verificados WHERE telefono LIKE $1 OR telefono = $2',
    ['%' + telefonoLimpio.slice(-10), telefonoLimpio]
  )

  if (telVerificado.rowCount > 0) {
    // Telefono verificado por admin: auto-confirmar sin SMS
    const table = tipoUsuario === 'medico' ? 'medicos' : 'pacientes'
    await pool.query(`UPDATE ${table} SET telefono_confirmado = true WHERE id = $1`, [user.id])

    // Log sin enviar SMS
    await pool.query(
      'INSERT INTO sms_log (telefono, mensaje, proveedor, estado, error_mensaje) VALUES ($1, $2, $3, $4, $5)',
      [telefonoLimpio, 'Auto-verificado (lista admin)', 'admin', 'auto-verificado', null]
    )

    return {
      success: true,
      mensaje: 'Telefono verificado automaticamente (numero en lista de prueba)',
      autoConfirmado: true,
      telefono: telefonoLimpio.replace(/(\d{4})$/, '****'),
    }
  }

  // Flujo normal: verificar SMS configurado
  const config = await getSmsConfig()
  if (!config.account_sid || !config.auth_token || !config.from_number) {
    throw createError({ statusCode: 503, message: 'El servicio SMS no esta configurado. Contacta al administrador.' })
  }

  // Verificar rate limiting: max 3 codigos por telefono en 10 minutos
  const recientes = await pool.query(
    `SELECT COUNT(*) as total FROM sms_confirmacion_tokens
     WHERE telefono = $1 AND created_at > NOW() - INTERVAL '10 minutes'`,
    [telefonoLimpio]
  )
  if (parseInt(recientes.rows[0].total) >= 3) {
    throw createError({ statusCode: 429, message: 'Demasiadas solicitudes. Espera 10 minutos antes de intentar de nuevo.' })
  }

  // Generar codigo de 6 digitos
  const codigo = generarCodigoVerificacion(6)
  const expiraEn = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

  // Guardar token
  await pool.query(
    `INSERT INTO sms_confirmacion_tokens (id_usuario, tipo_usuario, telefono, codigo, expira_en)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, tipoUsuario, telefonoLimpio, codigo, expiraEn]
  )

  // Enviar SMS
  const mensaje = `MediProtect: Tu codigo de verificacion es ${codigo}. Expira en 10 minutos.`
  const result = await enviarSms(telefonoLimpio, mensaje)

  if (!result.success) {
    throw createError({ statusCode: 500, message: `Error enviando SMS: ${result.error}` })
  }

  return {
    success: true,
    mensaje: 'Codigo de verificacion enviado',
    telefono: telefonoLimpio.replace(/(\d{4})$/, '****'),
    expira_en: expiraEn.toISOString()
  }
})
