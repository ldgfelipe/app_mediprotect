import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { enviarCorreo } from '../../utils/email.js'

export default defineEventHandler(async (event) => {
  const b = await readBody(event)
  const { nombre, apellido, email, password, telefono, fecha_nacimiento, genero, direccion, id_paquete,
    ciudad, como_nos_conociste, acepta_terminos, acepta_marketing,
    curp, estado_civil, ocupacion, beneficiario_nombre, beneficiario_parentesco, beneficiario_telefono,
    identificacion_tipo, identificacion_numero, acepta_seguro,
    apellido_paterno, apellido_materno, codigo_postal, estado, municipio, colonia, telefono2, hospital_consultorio,
    beneficiarios } = b

  const pool = await useDbPool(event)
  const existing = await pool.query('SELECT id FROM pacientes WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    throw createError({ statusCode: 400, message: 'El email ya está registrado' })
  }

  const password_hash = await bcrypt.hash(password, 10)
  const apellidoCompleto = [apellido_paterno, apellido_materno].filter(Boolean).join(' ') || apellido || null
  const result = await pool.query(
    `INSERT INTO pacientes (nombre, apellido, email, password_hash, telefono, fecha_nacimiento, genero, direccion,
      ciudad, como_nos_conociste, acepta_terminos, acepta_marketing,
      curp, estado_civil, ocupacion, beneficiario_nombre, beneficiario_parentesco, beneficiario_telefono,
      identificacion_tipo, identificacion_numero, acepta_seguro, plan_contratado,
      codigo_postal, colonia, estado, municipio)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
     RETURNING id, nombre, apellido, email, email_confirmado, telefono, fecha_nacimiento, genero, direccion, ciudad,
       curp, estado_civil, ocupacion, como_nos_conociste,
       beneficiario_nombre, beneficiario_parentesco, beneficiario_telefono,
       identificacion_tipo, identificacion_numero, acepta_seguro, plan_contratado,
       acepta_terminos, acepta_marketing, created_at`,
    [nombre, apellidoCompleto, email, password_hash, telefono, fecha_nacimiento, genero, direccion,
      ciudad || null, como_nos_conociste || null, acepta_terminos || false, acepta_marketing || false,
      curp || null, estado_civil || null, ocupacion || null, beneficiario_nombre || null, beneficiario_parentesco || null, beneficiario_telefono || null,
      identificacion_tipo || null, identificacion_numero || null, acepta_seguro || false, null,
      codigo_postal || null, colonia || null, estado || null, municipio || null]
  )

  const paciente = result.rows[0]

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

  let pagoId: string | null = null

  // Check if selected plan has a price
  let planInfo = null
  if (id_paquete) {
    const planResult = await pool.query('SELECT id, precio, nombre, slug FROM paquetes WHERE id = $1', [id_paquete])
    if (planResult.rows.length > 0) {
      planInfo = planResult.rows[0]
    }
  }

  const esPlanPago = planInfo && parseFloat(planInfo.precio) > 0

  if (esPlanPago) {
    // Paid plan: create pending payment, do NOT activate plan yet
    const pagoResult = await pool.query(
      `INSERT INTO pagos (id_paciente, id_plan, monto, moneda, provedor, estado, sandbox, descripcion)
       VALUES ($1, $2, $3, 'MXN', 'mercadopago', 'pendiente', true, $4)
       RETURNING id`,
      [paciente.id, id_paquete, planInfo.precio, `Plan ${planInfo.nombre} - Registro`]
    )
    pagoId = pagoResult.rows[0].id
  } else {
    // Free plan (basico): activate immediately
    if (id_paquete) {
      await pool.query(
        `INSERT INTO paciente_paquete (id_paciente, id_paquete, fecha_inicio, activo)
         VALUES ($1, $2, NOW(), true)`,
        [paciente.id, id_paquete]
      )
    } else {
      const basico = await pool.query("SELECT id FROM paquetes WHERE slug = 'basico' AND activo = true LIMIT 1")
      if (basico.rows.length > 0) {
        await pool.query(
          `INSERT INTO paciente_paquete (id_paciente, id_paquete, fecha_inicio, activo)
           VALUES ($1, $2, NOW(), true)`,
          [paciente.id, basico.rows[0].id]
        )
      }
    }
  }

  const token = jwt.sign(
    { id: paciente.id, email: paciente.email, tipo: 'paciente' },
    process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  const confirmToken = crypto.randomBytes(32).toString('hex')
  const expiraEn = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await pool.query(
    `INSERT INTO email_confirmacion_tokens (id_usuario, tipo_usuario, email, token, expira_en)
     VALUES ($1, 'paciente', $2, $3, $4)`,
    [paciente.id, paciente.email, confirmToken, expiraEn]
  )

  const baseUrl = process.env.APP_URL || 'https://app.mediprotect.com.mx'
  const confirmUrl = `${baseUrl}/confirmar-email?token=${confirmToken}&tipo=paciente`

  try {
    const planText = esPlanPago && planInfo ? `Tu plan: ${planInfo.nombre}` : 'Plan gratuito MediProtect Básico'
    await enviarCorreo(
      paciente.email,
      'Confirma tu correo en MediProtect',
      `<h2>Bienvenido, ${paciente.nombre} ${paciente.apellido}!</h2>
       <p>Tu cuenta de paciente ha sido registrada exitosamente en <strong>MediProtect</strong>.</p>
       <p><strong>${planText}</strong></p>
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

  setResponseStatus(event, 201)
  return { usuario: paciente, token, pago_id: pagoId }
})