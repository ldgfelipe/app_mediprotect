import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { enviarCorreo } from '../../utils/email.js'

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
    throw createError({ statusCode: 403, message: 'Solo administradores y asistentes pueden enviar confirmaciones' })
  }

  const body = await readBody(event)
  const { id, tipo } = body

  if (!id || !tipo) {
    throw createError({ statusCode: 400, message: 'id y tipo son requeridos' })
  }

  if (!['medico', 'paciente', 'empresa'].includes(tipo)) {
    throw createError({ statusCode: 400, message: 'Tipo invalido' })
  }

  const table = tipo === 'medico' ? 'medicos' : tipo === 'paciente' ? 'pacientes' : 'empresas'

  const pool = getPool()

  const querySelect = tipo === 'empresa'
    ? 'SELECT id, email, nombre, contacto_nombre, email_confirmado FROM empresas WHERE id = $1'
    : 'SELECT id, email, nombre, apellido, email_confirmado FROM ' + table + ' WHERE id = $1'

  const result = await pool.query(querySelect, [id])
  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Registro no encontrado' })
  }

  const registro = result.rows[0]

  const nombreDestino = registro.nombre + ' ' + (registro.apellido || registro.contacto_nombre || '')

  if (registro.email_confirmado) {
    return { mensaje: 'El correo ya esta confirmado', already_confirmed: true }
  }

  const tokenConfirm = crypto.randomBytes(32).toString('hex')
  const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await pool.query(
    `INSERT INTO email_confirmacion_tokens (id_usuario, tipo_usuario, email, token, expira_en)
     VALUES ($1, $2, $3, $4, $5)`,
    [registro.id, tipo, registro.email, tokenConfirm, expiraEn]
  )

  const baseUrl = process.env.APP_URL || 'https://app.mediprotect.com.mx'
  const confirmUrl = `${baseUrl}/confirmar-email?token=${tokenConfirm}&tipo=${tipo}`

  const etiqueta = tipo === 'medico' ? 'medico' : tipo === 'paciente' ? 'paciente' : 'empresa'

  try {
    await enviarCorreo(
      registro.email,
      'Confirma tu correo en MediProtect',
      `<h2>Hola, ${nombreDestino.trim()}!</h2>
       <p>Tu cuenta de <strong>${etiqueta}</strong> en <strong>MediProtect</strong> necesita confirmar su correo electrónico.</p>
       <p>Haz clic en el siguiente enlace para confirmarlo:</p>
       <p><a href="${confirmUrl}" style="display:inline-block;background:#00b894;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Confirmar mi correo</a></p>
       <p>Si no puedes hacer clic, copia y pega esta URL en tu navegador:</p>
       <p style="word-break:break-all;font-size:0.85rem;color:#636e72;">${confirmUrl}</p>
       <p>Este enlace expira en 24 horas.</p>
       <p>Saludos,<br>Equipo MediProtect</p>`
    )
  } catch (e: any) {
    console.error('Error enviando correo de confirmacion:', e.message)
    throw createError({ statusCode: 500, message: 'Error al enviar el correo de confirmacion' })
  }

  return { success: true, mensaje: 'Correo de confirmacion enviado a ' + registro.email, email: registro.email }
})