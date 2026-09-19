import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { enviarCorreo } from '../../utils/email.js'

export default defineEventHandler(async (event) => {
  const _user = verifyAdminOrAsistenteToken(event)

  const body = await readBody(event)
  const { nombre, apellido, email, password, telefono, fecha_nacimiento, genero, ciudad, curp, id_empresa,
    apellido_paterno, apellido_materno, codigo_postal, estado, municipio, telefono2, hospital_consultorio,
    id_paquete, beneficiarios, colonia } = body

  if (!nombre || !email) {
    throw createError({ statusCode: 400, message: 'Nombre y email son requeridos' })
  }

  const curpUpper = (curp || '').toUpperCase().trim()
  if (curpUpper && !/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curpUpper)) {
    throw createError({ statusCode: 400, message: 'El formato de CURP no es válido' })
  }

  if (codigo_postal && !/^\d{5}$/.test(codigo_postal)) {
    throw createError({ statusCode: 400, message: 'El código postal debe tener 5 dígitos' })
  }

  const pool = await useDbPool(event)

  const existing = await pool.query('SELECT id FROM pacientes WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    throw createError({ statusCode: 400, message: 'El email ya está registrado' })
  }

  const password_hash = await bcrypt.hash(password || 'mediprotect123', 10)
  const apellidoFinal = apellido || apellido_paterno || null
  const apellidoPat = apellido_paterno || apellido || null

  const result = await pool.query(`
    INSERT INTO pacientes (nombre, apellido, apellido_paterno, apellido_materno, email, password_hash, telefono, fecha_nacimiento, genero, ciudad, curp,
      codigo_postal, estado, municipio, telefono2, hospital_consultorio, colonia, email_confirmado)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, false)
    RETURNING id, nombre, apellido, apellido_paterno, apellido_materno, email, email_confirmado, telefono, fecha_nacimiento, genero, ciudad, curp,
      codigo_postal, estado, municipio, telefono2, hospital_consultorio, colonia, created_at
  `, [
    nombre, apellidoFinal, apellidoPat, apellido_materno || null, email, password_hash,
    telefono || null, fecha_nacimiento || null, genero || null,
    ciudad || null, curpUpper || null, codigo_postal || null, estado || null, municipio || null,
    telefono2 || null, hospital_consultorio || null, colonia || null
  ])

  const paciente = result.rows[0]

  const confirmToken = crypto.randomBytes(32).toString('hex')
  const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await pool.query(
    `INSERT INTO email_confirmacion_tokens (id_usuario, tipo_usuario, email, token, expira_en)
     VALUES ($1, 'paciente', $2, $3, $4)`,
    [paciente.id, email, confirmToken, expiraEn]
  )

  const baseUrl = process.env.APP_URL || 'https://app.mediprotect.com.mx'
  const confirmUrl = `${baseUrl}/confirmar-email?token=${confirmToken}&tipo=paciente`

  try {
    await enviarCorreo(
      email,
      'Confirma tu correo en MediProtect',
      `<h2>Bienvenido, ${nombre} ${apellido || ''}!</h2>
       <p>Tu cuenta de paciente ha sido registrada exitosamente en <strong>MediProtect</strong>.</p>
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

  if (id_empresa) {
    try {
      await pool.query(
        'INSERT INTO empresa_pacientes (id_empresa, id_paciente) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id_empresa, paciente.id]
      )
    } catch {}
  }

  if (Array.isArray(beneficiarios) && beneficiarios.length > 0) {
    for (const b of beneficiarios) {
      try {
        await pool.query(
          `INSERT INTO beneficiarios_paciente (id_paciente, nombre, apellido_paterno, apellido_materno, parentesco, telefono)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [paciente.id, b.nombre, b.apellido_paterno || null, b.apellido_materno || null, b.parentesco || null, b.telefono || null]
        )
      } catch {}
    }
  }

  if (id_paquete) {
    const planInfo = await pool.query('SELECT id, precio, slug FROM paquetes WHERE id = $1 AND activo = true', [id_paquete])
    if (planInfo.rows.length > 0) {
      const esGratis = parseFloat(planInfo.rows[0].precio) === 0
      if (esGratis) {
        await pool.query(
          `INSERT INTO paciente_paquete (id_paciente, id_paquete, fecha_inicio, activo)
           VALUES ($1, $2, NOW(), true)`,
          [paciente.id, id_paquete]
        )
        await pool.query('UPDATE pacientes SET plan_contratado = $1 WHERE id = $2', [planInfo.rows[0].slug, paciente.id])
      } else {
        await pool.query(
          `INSERT INTO pagos (id_paciente, id_plan, monto, moneda, provedor, estado, sandbox, descripcion)
           VALUES ($1, $2, $3, 'MXN', 'admin', 'pendiente', true, $4)`,
          [paciente.id, id_paquete, planInfo.rows[0].precio, `Plan ${planInfo.rows[0].slug} - Asignado por admin`]
        )
      }
    }
  }

  setResponseStatus(event, 201)
  return { paciente }
})