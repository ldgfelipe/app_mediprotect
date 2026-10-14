import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { enviarCorreo } from './email.js'

export interface CreateMedicoInput {
  nombre?: string
  apellido?: string
  apellido_paterno?: string
  apellido_materno?: string
  email?: string
  telefono?: string
  cedula_profesional?: string
  titulo?: string
  especialidad?: string
  ciudad?: string
  bio?: string
  servicios?: string
  universidad?: string
  horario_atencion?: string
  idiomas?: string
  usuario?: string
  password?: string
  rfc?: string
  hospital_consultorio?: string
  tipo_consulta?: string
  curp?: string
  codigo_postal?: string
  colonia?: string
  consultorio_ciudad?: string
  consultorio_estado?: string
  consultorio_direccion?: string
  comision_tipo?: number | string | null
  // Campos del CRM
  comision_por_cita?: number | string | null
  convenio_firmado?: boolean
  fecha_firma_convenio?: string | null
  fecha_afiliacion?: string | null
  advertencias?: number | null
  notas?: string | null
  // Metadatos de origen (opcional, no rompe nada)
  perfil_url_path?: string | null
  empresa_id?: string | null
}

export interface CreateMedicoOptions {
  enviarConfirmacion?: boolean
  emitirEvento?: boolean
}

export class MedicoInputError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'MedicoInputError'
    this.statusCode = statusCode
  }
}

const CURP_RE = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/

function buildSlug(nombre: string, apellido: string): string {
  return `${nombre} ${apellido}`
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : null
}

/**
 * Crea un médico reutilizando exactamente la lógica del endpoint
 * POST /api/admin/medicos (slug, especialidad, email de confirmación, evento socket).
 * Lanza MedicoInputError con statusCode para que el llamador decida cómo responder.
 */
export async function createMedico(
  pool: any,
  input: CreateMedicoInput,
  opts: CreateMedicoOptions = {}
) {
  const { enviarConfirmacion = true, emitirEvento = true } = opts

  const nombre = (input.nombre || '').trim()
  const apellido = (input.apellido || input.apellido_paterno || '').trim()

  if (!nombre || (!input.apellido && !input.apellido_paterno)) {
    throw new MedicoInputError('Nombre y apellido son requeridos')
  }

  const curpUpper = (input.curp || '').toUpperCase().trim()
  if (curpUpper && !CURP_RE.test(curpUpper)) {
    throw new MedicoInputError('El formato de CURP no es válido')
  }

  if (input.codigo_postal && !/^\d{5}$/.test(String(input.codigo_postal))) {
    throw new MedicoInputError('El código postal debe tener 5 dígitos')
  }

  const email = (input.email || '').trim() || null
  const usuario = (input.usuario || '').trim() || null

  if (email) {
    const existing = await pool.query('SELECT id FROM medicos WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      throw new MedicoInputError('El email ya está registrado')
    }
  }

  if (usuario) {
    const dupUser = await pool.query('SELECT id FROM medicos WHERE usuario = $1', [usuario])
    if (dupUser.rowCount > 0) {
      throw new MedicoInputError('Ya existe un médico con ese usuario')
    }
  }

  let idEspecialidad: any = null
  if (input.especialidad) {
    const espResult = await pool.query(
      'SELECT id FROM especialidades WHERE LOWER(nombre) = LOWER($1) LIMIT 1',
      [input.especialidad]
    )
    if (espResult.rowCount > 0) {
      idEspecialidad = espResult.rows[0].id
    } else {
      const newEsp = await pool.query(
        'INSERT INTO especialidades (nombre) VALUES ($1) RETURNING id',
        [input.especialidad]
      )
      idEspecialidad = newEsp.rows[0].id
    }
  }

  const slug = buildSlug(nombre, apellido)

  const serviciosArray = input.servicios
    ? String(input.servicios).split(',').map((s: string) => s.trim()).filter(Boolean)
    : []
  const idiomasArray = input.idiomas
    ? String(input.idiomas).split(',').map((i: string) => i.trim()).filter(Boolean)
    : ['Español']

  let passwordHash = null
  if (input.password && String(input.password).trim()) {
    passwordHash = await bcrypt.hash(String(input.password), 10)
  }

  try {
    const result = await pool.query(`
      INSERT INTO medicos (
        nombre, apellido, email, telefono, cedula_profesional,
        titulo, id_especialidad, slug, activo, usuario, password_hash,
        apellido_paterno, apellido_materno, rfc, hospital_consultorio, tipo_consulta,
        curp, codigo_postal, colonia, consultorio_ciudad, consultorio_estado, consultorio_direccion, email_confirmado,
        comision_tipo,
        comision_por_cita, convenio_firmado, fecha_firma_convenio, fecha_afiliacion, advertencias, notas,
        servicios, idiomas, perfil_url_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, false, $22,
        $23, $24, $25, $26, $27, $28, $29, $30, $31)
      RETURNING id, nombre, apellido, email, email_confirmado, telefono, cedula_profesional,
                titulo, slug, activo, usuario, created_at,
                apellido_paterno, apellido_materno, rfc, hospital_consultorio, tipo_consulta,
                curp, codigo_postal, colonia, consultorio_ciudad, consultorio_estado, consultorio_direccion,
                comision_tipo, comision_por_cita, convenio_firmado, fecha_firma_convenio, fecha_afiliacion, advertencias, notas
    `, [
      nombre, apellido, email, input.telefono || null, input.cedula_profesional || null,
      input.titulo || null, idEspecialidad, slug, usuario, passwordHash,
      input.apellido_paterno || input.apellido || null, input.apellido_materno || null, input.rfc || null,
      input.hospital_consultorio || null, input.tipo_consulta || null,
      curpUpper || null, input.codigo_postal || null, input.colonia || null,
      input.consultorio_ciudad || input.ciudad || null, input.consultorio_estado || null, input.consultorio_direccion || null,
      input.comision_tipo || 1,
      toNumberOrNull(input.comision_por_cita),
      input.convenio_firmado === true,
      input.fecha_firma_convenio || null,
      input.fecha_afiliacion || null,
      input.advertencias ?? 0,
      input.notas || null,
      JSON.stringify(serviciosArray),
      JSON.stringify(idiomasArray),
      input.perfil_url_path || null
    ])

    const medico = result.rows[0]

    if (emitirEvento) {
      try {
        const { emitCitaEvento } = await import('./socket-emitter')
        emitCitaEvento('medico:created', { id: medico.id, medico_id: medico.id, nombre: medico.nombre, apellido: medico.apellido })
      } catch {}
    }

    if (email && enviarConfirmacion) {
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
           <p>Tu cuenta de médico ha sido registrada exitosamente en <strong>MediProtect</strong>.</p>
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

    return {
      medico: {
        ...medico,
        especialidad_nombre: input.especialidad || null,
        consultorio_ciudad: input.consultorio_ciudad || input.ciudad || null
      }
    }
  } catch (err: any) {
    if (err instanceof MedicoInputError) throw err
    if (err.code === '23505') {
      throw new MedicoInputError('Ya existe un médico con esa cédula o email')
    }
    throw new MedicoInputError('Error al guardar médico: ' + err.message, 500)
  }
}
