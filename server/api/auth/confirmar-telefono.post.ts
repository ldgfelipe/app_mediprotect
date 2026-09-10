import jwt from 'jsonwebtoken'

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
  const { codigo, telefono, tipo } = body

  if (!codigo || !telefono) {
    throw createError({ statusCode: 400, message: 'Codigo y telefono son requeridos' })
  }

  const tipoUsuario = tipo || user.tipo
  if (!['medico', 'paciente', 'empresa'].includes(tipoUsuario)) {
    throw createError({ statusCode: 400, message: 'Tipo invalido' })
  }

  const pool = useDbPool(event)
  const telefonoLimpio = telefono.replace(/[^0-9+]/g, '')

  // Buscar token valido
  const tokenResult = await pool.query(
    `SELECT id, id_usuario, codigo, expira_en, used, intentos
     FROM sms_confirmacion_tokens
     WHERE id_usuario = $1 AND tipo_usuario = $2 AND telefono = $3 AND used = false
     ORDER BY created_at DESC LIMIT 1`,
    [user.id, tipoUsuario, telefonoLimpio]
  )

  if (tokenResult.rows.length === 0) {
    throw createError({ statusCode: 400, message: 'No se encontro un codigo de verificacion activo. Solicita uno nuevo.' })
  }

  const tokenData = tokenResult.rows[0]

  // Verificar expiracion
  if (new Date(tokenData.expira_en) < new Date()) {
    throw createError({ statusCode: 400, message: 'El codigo ha expirado. Solicita uno nuevo.' })
  }

  // Verificar intentos (max 5)
  if (tokenData.intentos >= 5) {
    throw createError({ statusCode: 429, message: 'Demasiados intentos. Solicita un nuevo codigo.' })
  }

  // Incrementar intentos
  await pool.query(
    'UPDATE sms_confirmacion_tokens SET intentos = intentos + 1 WHERE id = $1',
    [tokenData.id]
  )

  // Verificar codigo
  if (tokenData.codigo !== codigo) {
    throw createError({ statusCode: 400, message: 'Codigo incorrecto. Intento ' + (tokenData.intentos + 1) + ' de 5.' })
  }

  // Marcar como usado
  await pool.query(
    'UPDATE sms_confirmacion_tokens SET used = true WHERE id = $1',
    [tokenData.id]
  )

  // Actualizar telefono_confirmado
  const table = tipoUsuario === 'medico' ? 'medicos' : tipoUsuario === 'paciente' ? 'pacientes' : 'empresas'
  await pool.query(
    `UPDATE ${table} SET telefono_confirmado = true WHERE id = $1`,
    [user.id]
  )

  // Retornar nuevo JWT con telefono_confirmado
  const nuevoToken = jwt.sign(
    { id: user.id, email: user.email, tipo: tipoUsuario },
    process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  return {
    success: true,
    mensaje: 'Telefono confirmado exitosamente',
    token: nuevoToken
  }
})
