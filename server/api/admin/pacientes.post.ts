import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const body = await readBody(event)
  const { nombre, apellido, email, password, telefono, fecha_nacimiento, genero, ciudad, curp, id_empresa,
    apellido_paterno, apellido_materno, codigo_postal, estado, municipio, telefono2, hospital_consultorio,
    beneficiarios } = body

  if (!nombre || !email) {
    throw createError({ statusCode: 400, message: 'Nombre y email son requeridos' })
  }

  const pool = getPool()

  const existing = await pool.query('SELECT id FROM pacientes WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    throw createError({ statusCode: 400, message: 'El email ya está registrado' })
  }

  const password_hash = await bcrypt.hash(password || 'mediprotect123', 10)

  const apellidoPat = apellido_paterno || (apellido ? apellido : null)

  const result = await pool.query(`
    INSERT INTO pacientes (nombre, apellido, apellido_paterno, apellido_materno, email, password_hash, telefono, fecha_nacimiento, genero, ciudad, curp,
      codigo_postal, estado, municipio, telefono2, hospital_consultorio)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    RETURNING id, nombre, apellido, apellido_paterno, apellido_materno, email, telefono, fecha_nacimiento, genero, ciudad, curp,
      codigo_postal, estado, municipio, telefono2, hospital_consultorio, created_at
  `, [
    nombre, apellido || null, apellidoPat, apellido_materno || null, email, password_hash,
    telefono || null, fecha_nacimiento || null, genero || null,
    ciudad || null, curp || null, codigo_postal || null, estado || null, municipio || null,
    telefono2 || null, hospital_consultorio || null
  ])

  const paciente = result.rows[0]

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

  setResponseStatus(event, 201)
  return { paciente }
})
