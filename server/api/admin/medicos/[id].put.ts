import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const {
    nombre, apellido, email, telefono, cedula_profesional,
    titulo, especialidad, consultorio_ciudad, consultorio_estado,
    consultorio_direccion, bio, activo, password,
    precio_regular, precio_miembro, usuario,
    apellido_paterno, apellido_materno, rfc, hospital_consultorio, tipo_consulta,
    curp, codigo_postal, colonia, telefono_confirmado, email_confirmado
  } = body

  const pool = useDbPool(event)

  const existing = await pool.query('SELECT id FROM medicos WHERE id = $1', [id])
  if (existing.rowCount === 0) {
    throw createError({ statusCode: 404, message: 'Médico no encontrado' })
  }

  const curpUpper = (curp || '').toUpperCase().trim()
  if (curpUpper && !/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curpUpper)) {
    throw createError({ statusCode: 400, message: 'El formato de CURP no es válido' })
  }

  if (codigo_postal && !/^\d{5}$/.test(codigo_postal)) {
    throw createError({ statusCode: 400, message: 'El código postal debe tener 5 dígitos' })
  }

  if (email) {
    const dup = await pool.query('SELECT id FROM medicos WHERE email = $1 AND id != $2', [email, id])
    if (dup.rowCount > 0) {
      throw createError({ statusCode: 400, message: 'Ya existe otro médico con ese email' })
    }
  }

  if (usuario) {
    const dupUser = await pool.query('SELECT id FROM medicos WHERE usuario = $1 AND id != $2', [usuario, id])
    if (dupUser.rowCount > 0) {
      throw createError({ statusCode: 400, message: 'Ya existe otro médico con ese usuario' })
    }
  }

  let passwordHash = null
  if (password && password.trim()) {
    passwordHash = await bcrypt.hash(password, 10)
  }

  let idEspecialidad = null
  if (especialidad !== undefined) {
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
  }

  const sets = []
  const params = []
  let idx = 1

  if (nombre !== undefined) { sets.push(`nombre = $${idx++}`); params.push(nombre) }
  if (apellido !== undefined) { sets.push(`apellido = $${idx++}`); params.push(apellido) }
  if (email !== undefined) { sets.push(`email = $${idx++}`); params.push(email || null) }
  if (telefono !== undefined) { sets.push(`telefono = $${idx++}`); params.push(telefono || null) }
  if (cedula_profesional !== undefined) { sets.push(`cedula_profesional = $${idx++}`); params.push(cedula_profesional || null) }
  if (titulo !== undefined) { sets.push(`titulo = $${idx++}`); params.push(titulo || null) }
  if (idEspecialidad !== null) { sets.push(`id_especialidad = $${idx++}`); params.push(idEspecialidad) }
  if (especialidad === null || especialidad === '') { sets.push(`id_especialidad = NULL`) }
  if (consultorio_ciudad !== undefined) { sets.push(`consultorio_ciudad = $${idx++}`); params.push(consultorio_ciudad || null) }
  if (consultorio_estado !== undefined) { sets.push(`consultorio_estado = $${idx++}`); params.push(consultorio_estado || null) }
  if (consultorio_direccion !== undefined) { sets.push(`consultorio_direccion = $${idx++}`); params.push(consultorio_direccion || null) }
  if (bio !== undefined) { sets.push(`bio = $${idx++}`); params.push(bio || null) }
  if (activo !== undefined) { sets.push(`activo = $${idx++}`); params.push(activo) }
  if (precio_regular !== undefined) { sets.push(`precio_regular = $${idx++}`); params.push(precio_regular || null) }
  if (precio_miembro !== undefined) { sets.push(`precio_miembro = $${idx++}`); params.push(precio_miembro || null) }
  if (usuario !== undefined) { sets.push(`usuario = $${idx++}`); params.push(usuario || null) }
  if (passwordHash) { sets.push(`password_hash = $${idx++}`); params.push(passwordHash) }
  if (apellido_paterno !== undefined) { sets.push(`apellido_paterno = $${idx++}`); params.push(apellido_paterno || apellido || null) }
  if (apellido_materno !== undefined) { sets.push(`apellido_materno = $${idx++}`); params.push(apellido_materno || null) }
  if (rfc !== undefined) { sets.push(`rfc = $${idx++}`); params.push(rfc || null) }
  if (hospital_consultorio !== undefined) { sets.push(`hospital_consultorio = $${idx++}`); params.push(hospital_consultorio || null) }
  if (tipo_consulta !== undefined) { sets.push(`tipo_consulta = $${idx++}`); params.push(tipo_consulta || null) }
  if (curp !== undefined) { sets.push(`curp = $${idx++}`); params.push(curpUpper || null) }
  if (codigo_postal !== undefined) { sets.push(`codigo_postal = $${idx++}`); params.push(codigo_postal || null) }
  if (colonia !== undefined) { sets.push(`colonia = $${idx++}`); params.push(colonia || null) }
  if (telefono_confirmado !== undefined) { sets.push(`telefono_confirmado = $${idx++}`); params.push(telefono_confirmado) }
  if (email_confirmado !== undefined) { sets.push(`email_confirmado = $${idx++}`); params.push(email_confirmado) }

  if (sets.length === 0) {
    throw createError({ statusCode: 400, message: 'No hay datos para actualizar' })
  }

  params.push(id)
  const result = await pool.query(
    `UPDATE medicos SET ${sets.join(', ')} WHERE id = $${idx}
     RETURNING id, nombre, apellido, email, email_confirmado, telefono, cedula_profesional, titulo, activo, precio_regular, precio_miembro, created_at,
              apellido_paterno, apellido_materno, rfc, hospital_consultorio, tipo_consulta,
              curp, codigo_postal, colonia`,
    params
  )

  return { success: true, medico: result.rows[0] }
})