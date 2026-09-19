import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { enviarCorreo } from '../../utils/email.js'

export default defineEventHandler(async (event) => {
  const _user = verifyAdminOrAsistenteToken(event)

  const body = await readBody(event)
  const {
    nombre, apellido, email, telefono, cedula_profesional,
    titulo, especialidad, ciudad, hospital, bio, servicios,
    universidad, horario_atencion, idiomas, usuario, password,
    apellido_paterno, apellido_materno, rfc, hospital_consultorio, tipo_consulta,
    curp, codigo_postal, colonia, consultorio_ciudad, consultorio_estado, consultorio_direccion,
    comision_tipo
  } = body

  if (!nombre || (!apellido && !apellido_paterno)) {
    throw createError({ statusCode: 400, message: 'Nombre y apellido son requeridos' })
  }

  const curpUpper = (curp || '').toUpperCase().trim()
  if (curpUpper && !/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curpUpper)) {
    throw createError({ statusCode: 400, message: 'El formato de CURP no es v�lido' })
  }

  if (codigo_postal && !/^\d{5}$/.test(codigo_postal)) {
    throw createError({ statusCode: 400, message: 'El c�digo postal debe tener 5 d�gitos' })
  }

  const pool = await useDbPool(event)

  if (email) {
    const existing = await pool.query('SELECT id FROM medicos WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      throw createError({ statusCode: 400, message: 'El email ya est� registrado' })
    }
  }

  if (usuario) {
    const dupUser = await pool.query('SELECT id FROM medicos WHERE usuario = $1', [usuario])
    if (dupUser.rowCount > 0) {
      throw createError({ statusCode: 400, message: 'Ya existe un m�dico con ese usuario' })
    }
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

  const slug = `${nombre} ${apellido || apellido_paterno}`
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')

  const serviciosArray = servicios ? servicios.split(',').map((s: string) => s.trim()).filter(Boolean) : []
  const idiomasArray = idiomas ? idiomas.split(',').map((i: string) => i.trim()).filter(Boolean) : ['Espa�ol']

  let passwordHash = null
  if (password && password.trim()) {
    passwordHash = await bcrypt.hash(password, 10)
  }

  try {
    const result = await pool.query(`
      INSERT INTO medicos (
        nombre, apellido, email, telefono, cedula_profesional,
        titulo, id_especialidad, slug, activo, usuario, password_hash,
        apellido_paterno, apellido_materno, rfc, hospital_consultorio, tipo_consulta,
        curp, codigo_postal, colonia, consultorio_ciudad, consultorio_estado, consultorio_direccion, email_confirmado,
        comision_tipo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, false, $22)
      RETURNING id, nombre, apellido, email, email_confirmado, telefono, cedula_profesional,
                titulo, slug, activo, usuario, created_at,
                apellido_paterno, apellido_materno, rfc, hospital_consultorio, tipo_consulta,
                curp, codigo_postal, colonia, consultorio_ciudad, consultorio_estado, consultorio_direccion,
                comision_tipo
    `, [
      nombre, apellido || apellido_paterno, email || null, telefono || null, cedula_profesional || null,
      titulo || null, idEspecialidad, slug, usuario || null, passwordHash,
      apellido_paterno || apellido || null, apellido_materno || null, rfc || null,
      hospital_consultorio || null, tipo_consulta || null,
      curpUpper || null, codigo_postal || null, colonia || null,
      consultorio_ciudad || ciudad || null, consultorio_estado || null, consultorio_direccion || null,
      comision_tipo || 1
    ])

    const medico = result.rows[0]

    if (email) {
      const confirmToken = crypto.randomBytes(32).toString('hex')
      const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await pool.query(
        `INSERT INTO email_confirmacion_tokens (id_usuario, tipo_usuario, email, token, expira_en)
         VALUES ($1, 'medico', $2, $3, $4)`,
        [medico.id, email, confirmToken, expiraEn]
      )

      const baseUrl = process.env.APP_URL || 'https://app.mediprotect.com.mx'
      const confirmUrl = `${baseUrl}/confirmar-email?token=${confirmToken}&tipo=medico`

      try {
        await enviarCorreo(
          email,
          'Confirma tu correo en MediProtect',
          `<h2>Bienvenido, ${nombre} ${apellido}!</h2>
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
    }

    return {
      success: true,
      medico: {
        ...medico,
        especialidad_nombre: especialidad,
        consultorio_ciudad: ciudad
      }
    }
  } catch (err: any) {
    if (err.code === '23505') {
      throw createError({ statusCode: 400, message: 'Ya existe un m�dico con esa c�dula o email' })
    }
    throw createError({ statusCode: 500, message: 'Error al guardar m�dico: ' + err.message })
  }
})