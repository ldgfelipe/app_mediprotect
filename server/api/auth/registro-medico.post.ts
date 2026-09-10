import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { enviarCorreo } from '../../utils/email.js'

function generarSlug(nombre: string, apellido: string): string {
  return (nombre + '-' + apellido)
    .toLowerCase()
    .replace(/[����]/g, 'a').replace(/[����]/g, 'e').replace(/[����]/g, 'i')
    .replace(/[����]/g, 'o').replace(/[����]/g, 'u').replace(/�/g, 'n')
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export default defineEventHandler(async (event) => {
  const { nombre, apellido, email, password, telefono, cedula_profesional, especialidad, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio, apellido_paterno, apellido_materno, rfc, hospital_consultorio, tipo_consulta, curp, codigo_postal, colonia } = await readBody(event)

  const curpUpper = (curp || '').toUpperCase().trim()
  if (curpUpper && !/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curpUpper)) {
    throw createError({ statusCode: 400, message: 'El formato de CURP no es v�lido' })
  }

  if (codigo_postal && !/^\d{5}$/.test(codigo_postal)) {
    throw createError({ statusCode: 400, message: 'El c�digo postal debe tener 5 d�gitos' })
  }

  const pool = useDbPool(event)
  const existing = await pool.query('SELECT id FROM medicos WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    throw createError({ statusCode: 400, message: 'El email ya est� registrado' })
  }

  let idEspecialidad = null
  if (especialidad) {
    const espResult = await pool.query(
      'SELECT id FROM especialidades WHERE LOWER(nombre) = LOWER($1) LIMIT 1',
      [especialidad]
    )
    if (espResult.rowCount > 0) {
      idEspecialidad = espResult.rows[0].id
    } else {
      const newEsp = await pool.query(
        'INSERT INTO especialidades (nombre) VALUES ($1) RETURNING id',
        [especialidad]
      )
      idEspecialidad = newEsp.rows[0].id
    }
  }

  let slug = generarSlug(nombre, apellido)
  const slugExistente = await pool.query('SELECT id FROM medicos WHERE slug = $1', [slug])
  if (slugExistente.rows.length > 0) {
    slug = slug + '-' + Date.now().toString(36).slice(-4)
  }

  const password_hash = await bcrypt.hash(password, 10)
  const result = await pool.query(
    `INSERT INTO medicos (nombre, apellido, email, password_hash, telefono, cedula_profesional, id_especialidad, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio, slug, apellido_paterno, apellido_materno, rfc, hospital_consultorio, tipo_consulta, curp, codigo_postal, colonia)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING id, nombre, apellido, email, email_confirmado, telefono, cedula_profesional, id_especialidad, slug, created_at,
               apellido_paterno, apellido_materno, rfc, hospital_consultorio, tipo_consulta, curp, codigo_postal, colonia`,
    [nombre, apellido, email, password_hash, telefono, cedula_profesional, idEspecialidad, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio, slug, apellido_paterno || apellido || null, apellido_materno || null, rfc || null, hospital_consultorio || null, tipo_consulta || null, curpUpper || null, codigo_postal || null, colonia || null]
  )

  const medico = result.rows[0]
  const token = jwt.sign(
    { id: medico.id, email: medico.email, tipo: 'medico' },
    process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  const confirmToken = crypto.randomBytes(32).toString('hex')
  const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await pool.query(
    `INSERT INTO email_confirmacion_tokens (id_usuario, tipo_usuario, email, token, expira_en)
     VALUES ($1, 'medico', $2, $3, $4)`,
    [medico.id, medico.email, confirmToken, expiraEn]
  )

  const baseUrl = process.env.APP_URL || 'https://app.mediprotect.com.mx'
  const confirmUrl = `${baseUrl}/confirmar-email?token=${confirmToken}&tipo=medico`

  try {
    await enviarCorreo(
      medico.email,
      'Confirma tu correo en MediProtect',
      `<h2>Bienvenido, ${medico.nombre} ${medico.apellido}!</h2>
       <p>Tu cuenta de m�dico ha sido registrada exitosamente en <strong>MediProtect</strong>.</p>
       <p>Para completar tu registro, confirma tu correo electr�nico:</p>
       <p><a href="${confirmUrl}" style="display:inline-block;background:#00b894;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Confirmar mi correo</a></p>
       <p>Si no puedes hacer clic, copia y pega esta URL en tu navegador:</p>
       <p style="word-break:break-all;font-size:0.85rem;color:#636e72;">${confirmUrl}</p>
       <p>Este enlace expira en 24 horas.</p>
       <p>Saludos,<br>Equipo MediProtect</p>`
    )
  } catch (e: any) {
    console.error('Error enviando correo de confirmaci�n:', e.message)
  }

  setResponseStatus(event, 201)
  return { usuario: medico, token }
})