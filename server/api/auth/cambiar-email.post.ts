import crypto from 'crypto'
import { enviarCorreo } from '../../utils/email.js'
import { verifyToken } from '../../utils/auth.js'

export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  const body = await readBody(event)
  const nuevoEmail = (body?.nuevo_email || '').trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoEmail)) {
    throw createError({ statusCode: 400, message: 'Correo electrónico no válido' })
  }

  const table = decoded.tipo === 'medico' ? 'medicos' : 'pacientes'
  const pool = await useDbPool(event)

  const existente = await pool.query(
    `SELECT id FROM ${table} WHERE email = $1 AND id <> $2`,
    [nuevoEmail, decoded.id]
  )
  if (existente.rows.length > 0) {
    throw createError({ statusCode: 409, message: 'Ya existe un usuario registrado con ese correo' })
  }

  const updated = await pool.query(
    `UPDATE ${table} SET email = $1, email_confirmado = false, updated_at = NOW()
     WHERE id = $2
     RETURNING id, nombre, apellido, email, email_confirmado, telefono, telefono_confirmado`,
    [nuevoEmail, decoded.id]
  )
  if (updated.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Usuario no encontrado' })
  }

  await pool.query(
    `UPDATE email_confirmacion_tokens SET used = true
     WHERE id_usuario = $1 AND tipo_usuario = $2`,
    [decoded.id, decoded.tipo]
  )

  const confirmToken = crypto.randomBytes(32).toString('hex')
  const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await pool.query(
    `INSERT INTO email_confirmacion_tokens (id_usuario, tipo_usuario, email, token, expira_en)
     VALUES ($1, $2, $3, $4, $5)`,
    [decoded.id, decoded.tipo, nuevoEmail, confirmToken, expiraEn]
  )

  const baseUrl = process.env.APP_URL || 'https://app.mediprotect.com.mx'
  const confirmUrl = `${baseUrl}/confirmar-email?token=${confirmToken}&tipo=${decoded.tipo}`

  await enviarCorreo(
    nuevoEmail,
    'Confirma tu nuevo correo en MediProtect',
    `<h2>Hola, ${updated.rows[0].nombre} ${updated.rows[0].apellido}!</h2>
     <p>Has cambiado el correo de tu cuenta en <strong>MediProtect</strong>.</p>
     <p>Para confirmar tu nuevo correo electrónico, haz clic en el siguiente enlace:</p>
     <p><a href="${confirmUrl}" style="display:inline-block;background:#00b894;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Confirmar mi nuevo correo</a></p>
     <p>Si no puedes hacer clic, copia y pega esta URL en tu navegador:</p>
     <p style="word-break:break-all;font-size:0.85rem;color:#636e72;">${confirmUrl}</p>
     <p>Este enlace expira en 24 horas.</p>
     <p>Saludos,<br>Equipo MediProtect</p>`
  )

  return {
    mensaje: `Correo actualizado. Hemos enviado un enlace de confirmación a ${nuevoEmail}.`,
    usuario: { ...updated.rows[0], tipo: decoded.tipo },
  }
})