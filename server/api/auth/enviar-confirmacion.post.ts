import crypto from 'crypto'
import { enviarCorreo } from '../../utils/email.js'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No autorizado' })
  }

  let decoded: { id: string; email: string; tipo: string }
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') as any
  } catch {
    throw createError({ statusCode: 401, message: 'Token inválido' })
  }

  const body = await readBody(event)
  const { email, tipo } = body

  if (!email || !tipo) {
    throw createError({ statusCode: 400, message: 'Email y tipo son requeridos' })
  }

  if (!['medico', 'paciente'].includes(tipo)) {
    throw createError({ statusCode: 400, message: 'Tipo inválido' })
  }

  if (decoded.email !== email) {
    throw createError({ statusCode: 403, message: 'No autorizado para confirmar este correo' })
  }

  const pool = await useDbPool(event)

  const table = tipo === 'medico' ? 'medicos' : 'pacientes'
  const result = await pool.query(`SELECT id, email, nombre, apellido, email_confirmado FROM ${table} WHERE email = $1`, [email])
  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Usuario no encontrado' })
  }

  const usuario = result.rows[0]

  if (usuario.email_confirmado) {
    return { mensaje: 'El correo ya está confirmado', already_confirmed: true }
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await pool.query(
    `INSERT INTO email_confirmacion_tokens (id_usuario, tipo_usuario, email, token, expira_en)
     VALUES ($1, $2, $3, $4, $5)`,
    [usuario.id, tipo, usuario.email, token, expiraEn]
  )

  const baseUrl = process.env.APP_URL || 'https://app.mediprotect.com.mx'
  const confirmUrl = `${baseUrl}/confirmar-email?token=${token}&tipo=${tipo}`

  try {
    await enviarCorreo(
      usuario.email,
      'Confirma tu correo en MediProtect',
      `<h2>Hola, ${usuario.nombre} ${usuario.apellido}!</h2>
       <p>Para completar tu registro en <strong>MediProtect</strong>, necesitas confirmar tu correo electrónico.</p>
       <p>Haz clic en el siguiente enlace:</p>
       <p><a href="${confirmUrl}" style="display:inline-block;background:#00b894;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Confirmar mi correo</a></p>
       <p>Si no puedes hacer clic, copia y pega esta URL en tu navegador:</p>
       <p style="word-break:break-all;font-size:0.85rem;color:#636e72;">${confirmUrl}</p>
       <p>Este enlace expira en 24 horas.</p>
       <p>Saludos,<br>Equipo MediProtect</p>`
    )
  } catch (e: any) {
    console.error('Error enviando correo de confirmación:', e.message)
    throw createError({ statusCode: 500, message: 'Error al enviar el correo de confirmación' })
  }

  return { mensaje: 'Correo de confirmación enviado a ' + usuario.email }
})