import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { enviarSms, generarCodigoVerificacion, getConexionesActivas } from '../../utils/sms.js'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user: any
  try {
    user = jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch {
    throw createError({ statusCode: 401, message: 'Token invalido' })
  }

  if (user.tipo !== 'admin' && user.rol !== 'admin' && user.tipo !== 'asistente') {
    throw createError({ statusCode: 403, message: 'Solo administradores y asistentes pueden enviar SMS de confirmacion' })
  }

  const body = await readBody(event)
  const { id, tipo, telefono } = body

  if (!id || !tipo) {
    throw createError({ statusCode: 400, message: 'id y tipo son requeridos' })
  }

  if (!['medico', 'paciente', 'empresa'].includes(tipo)) {
    throw createError({ statusCode: 400, message: 'Tipo invalido' })
  }

  const table = tipo === 'medico' ? 'medicos' : tipo === 'paciente' ? 'pacientes' : 'empresas'

  const pool = getPool()

  const result = await pool.query(
    `SELECT id, telefono FROM ${table} WHERE id = $1`,
    [id]
  )
  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Registro no encontrado' })
  }

  const telefonoDestino = (telefono || result.rows[0].telefono || '').toString()
  const telefonoLimpio = telefonoDestino.replace(/[^0-9+]/g, '')
  if (telefonoLimpio.length < 10) {
    throw createError({ statusCode: 400, message: 'El telefono debe tener al menos 10 digitos' })
  }

  // Verificar si el telefono esta en la lista de verificados por admin
  const telVerificado = await pool.query(
    'SELECT id FROM telefonos_verificados WHERE telefono LIKE $1 OR telefono = $2',
    ['%' + telefonoLimpio.slice(-10), telefonoLimpio]
  )

  if (telVerificado.rowCount > 0) {
    await pool.query(`UPDATE ${table} SET telefono_confirmado = true WHERE id = $1`, [id])
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

  // Verificar que exista una conexion SMS activa (twilio o API REST)
  const conexiones = await getConexionesActivas()
  if (conexiones.length === 0) {
    throw createError({ statusCode: 503, message: 'El servicio SMS no esta configurado. Agrega una conexion o contacta al administrador.' })
  }

  // Rate limiting: max 3 codigos por telefono en 10 minutos
  const recientes = await pool.query(
    `SELECT COUNT(*) as total FROM sms_confirmacion_tokens
     WHERE telefono = $1 AND created_at > NOW() - INTERVAL '10 minutes'`,
    [telefonoLimpio]
  )
  if (parseInt(recientes.rows[0].total) >= 3) {
    throw createError({ statusCode: 429, message: 'Demasiadas solicitudes. Espera 10 minutos antes de intentar de nuevo.' })
  }

  const codigo = generarCodigoVerificacion(6)
  const expiraEn = new Date(Date.now() + 10 * 60 * 1000)

  await pool.query(
    `INSERT INTO sms_confirmacion_tokens (id_usuario, tipo_usuario, telefono, codigo, expira_en)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, tipo, telefonoLimpio, codigo, expiraEn]
  )

  const mensaje = `MediProtect: Tu codigo de verificacion es ${codigo}. Expira en 10 minutos.`
  const resultSms = await enviarSms(telefonoLimpio, mensaje)

  if (!resultSms.success) {
    throw createError({ statusCode: 500, message: `Error enviando SMS: ${resultSms.error}` })
  }

  return {
    success: true,
    mensaje: 'Codigo de verificacion enviado',
    telefono: telefonoLimpio.replace(/(\d{4})$/, '****'),
    expira_en: expiraEn.toISOString()
  }
})