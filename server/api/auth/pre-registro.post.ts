import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { enviarCorreo } from '../../utils/email.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { nombre, telefono, email, id_medico } = body

  if (!nombre || !telefono || !id_medico) {
    throw createError({ statusCode: 400, message: 'nombre, telefono e id_medico son requeridos' })
  }

  const pool = useDbPool(event)

  const medico = await pool.query(
    'SELECT id, nombre, apellido, telefono FROM medicos WHERE id = $1 AND activo = true', [id_medico]
  )
  if (medico.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Médico no encontrado' })
  }

  let id_paciente = null
  let esNuevo = false
  let pacienteEmail = null

  if (email) {
    const existente = await pool.query('SELECT id, nombre, apellido FROM pacientes WHERE email = $1', [email])
    if (existente.rows.length > 0) {
      id_paciente = existente.rows[0].id
      pacienteEmail = existente.rows[0]
    }
  }

  if (!id_paciente && telefono) {
    const existente = await pool.query('SELECT id, nombre, apellido, email FROM pacientes WHERE telefono = $1', [telefono])
    if (existente.rows.length > 0) {
      id_paciente = existente.rows[0].id
      pacienteEmail = existente.rows[0]
    }
  }

  if (!id_paciente) {
    const password_temp = Math.random().toString(36).slice(-8)
    const password_hash = await bcrypt.hash(password_temp, 10)
    const emailDef = email || `${telefono.replace(/[^0-9]/g, '')}@pre.mediprotect.com.mx`
    const nuevo = await pool.query(
      `INSERT INTO pacientes (nombre, apellido, email, password_hash, telefono, email_confirmado)
       VALUES ($1, '', $2, $3, $4, false)
       RETURNING id, nombre, email`,
      [nombre, emailDef, password_hash, telefono]
    )
    id_paciente = nuevo.rows[0].id
    esNuevo = true
    pacienteEmail = nuevo.rows[0]

    await pool.query(
      `INSERT INTO paciente_paquete (id_paciente, id_paquete, fecha_inicio, activo)
       VALUES ($1, 1, NOW(), true)`,
      [id_paciente]
    )

    if (email) {
      const confirmToken = crypto.randomBytes(32).toString('hex')
      const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await pool.query(
        `INSERT INTO email_confirmacion_tokens (id_usuario, tipo_usuario, email, token, expira_en)
         VALUES ($1, 'paciente', $2, $3, $4)`,
        [id_paciente, email, confirmToken, expiraEn]
      )

      const baseUrl = process.env.APP_URL || 'https://app.mediprotect.com.mx'
      const confirmUrl = `${baseUrl}/confirmar-email?token=${confirmToken}&tipo=paciente`

      try {
        await enviarCorreo(
          email,
          'Confirma tu correo en MediProtect',
          `<h2>Bienvenido, ${nombre}!</h2>
           <p>Tu cuenta ha sido creada por un asistente en <strong>MediProtect</strong>.</p>
           <p>Para completar tu registro, confirma tu correo electrónico:</p>
           <p><a href="${confirmUrl}" style="display:inline-block;background:#00b894;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Confirmar mi correo</a></p>
           <p>Si no puedes hacer clic, copia y pega esta URL en tu navegador:</p>
           <p style="word-break:break-all;font-size:0.85rem;color:#636e72;">${confirmUrl}</p>
           <p>Este enlace expira en 24 horas.</p>
           <p>Saludos,<br>Equipo MediProtect</p>`
        )
      } catch (e: any) {
        console.error('Error enviando correo de confirmación:', e.message)
      }
    }
  }

  const folioRes = await pool.query(
    `SELECT 'MP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6)) as folio`
  )
  const folio = folioRes.rows[0].folio

  await pool.query(
    `INSERT INTO solicitudes (folio, id_paciente, id_medico, nombre, telefono, email)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [folio, id_paciente, id_medico, nombre, telefono, email || null]
  )

  const m = medico.rows[0]
  const whatsappNum = m.whatsapp || m.telefono || process.env.WHATSAPP_NUMBER || '521234567890'
  const telefonoLimpio = whatsappNum.replace(/[^0-9]/g, '')
  const mensaje = encodeURIComponent(
    `Hola Dr. ${m.nombre} ${m.apellido}, soy ${nombre}, folio ${folio}, quiero agendar mi cita.`
  )
  const waLink = `https://wa.me/${telefonoLimpio}?text=${mensaje}`

  setResponseStatus(event, 201)
  return {
    folio,
    wa_link: waLink,
    es_nuevo: esNuevo,
    paciente_id: id_paciente,
  }
})