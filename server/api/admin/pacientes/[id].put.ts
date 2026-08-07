import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'default_secret') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { nombre, apellido, email, telefono, fecha_nacimiento, genero, ciudad, password,
    apellido_paterno, apellido_materno, codigo_postal, estado, municipio, telefono2, hospital_consultorio,
    beneficiarios } = body

  const pool = getPool()

  const existing = await pool.query('SELECT id FROM pacientes WHERE id = $1', [id])
  if (existing.rowCount === 0) {
    throw createError({ statusCode: 404, message: 'Paciente no encontrado' })
  }

  if (email) {
    const dup = await pool.query('SELECT id FROM pacientes WHERE email = $1 AND id != $2', [email, id])
    if (dup.rowCount > 0) {
      throw createError({ statusCode: 400, message: 'Ya existe otro paciente con ese email' })
    }
  }

  let passwordHash = null
  if (password && password.trim()) {
    passwordHash = await bcrypt.hash(password, 10)
  }

  const sets = []
  const params = []
  let idx = 1

  if (nombre !== undefined) { sets.push(`nombre = $${idx++}`); params.push(nombre) }
  if (apellido !== undefined) { sets.push(`apellido = $${idx++}`); params.push(apellido) }
  if (email !== undefined) { sets.push(`email = $${idx++}`); params.push(email) }
  if (telefono !== undefined) { sets.push(`telefono = $${idx++}`); params.push(telefono) }
  if (fecha_nacimiento !== undefined) { sets.push(`fecha_nacimiento = $${idx++}`); params.push(fecha_nacimiento || null) }
  if (genero !== undefined) { sets.push(`genero = $${idx++}`); params.push(genero || null) }
  if (ciudad !== undefined) { sets.push(`ciudad = $${idx++}`); params.push(ciudad || null) }
  if (passwordHash) { sets.push(`password_hash = $${idx++}`); params.push(passwordHash) }
  if (apellido_paterno !== undefined) { sets.push(`apellido_paterno = $${idx++}`); params.push(apellido_paterno) }
  if (apellido_materno !== undefined) { sets.push(`apellido_materno = $${idx++}`); params.push(apellido_materno) }
  if (codigo_postal !== undefined) { sets.push(`codigo_postal = $${idx++}`); params.push(codigo_postal || null) }
  if (estado !== undefined) { sets.push(`estado = $${idx++}`); params.push(estado || null) }
  if (municipio !== undefined) { sets.push(`municipio = $${idx++}`); params.push(municipio || null) }
  if (telefono2 !== undefined) { sets.push(`telefono2 = $${idx++}`); params.push(telefono2 || null) }
  if (hospital_consultorio !== undefined) { sets.push(`hospital_consultorio = $${idx++}`); params.push(hospital_consultorio || null) }

  if (sets.length === 0) {
    throw createError({ statusCode: 400, message: 'No hay datos para actualizar' })
  }

  params.push(id)
  const result = await pool.query(
    `UPDATE pacientes SET ${sets.join(', ')} WHERE id = $${idx}
     RETURNING id, nombre, apellido, apellido_paterno, apellido_materno, email, telefono, fecha_nacimiento, genero, ciudad,
       codigo_postal, estado, municipio, telefono2, hospital_consultorio, created_at`,
    params
  )

  if (Array.isArray(beneficiarios)) {
    await pool.query('DELETE FROM beneficiarios_paciente WHERE id_paciente = $1', [id])
    for (const b of beneficiarios) {
      try {
        await pool.query(
          `INSERT INTO beneficiarios_paciente (id_paciente, nombre, apellido_paterno, apellido_materno, parentesco, telefono)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, b.nombre, b.apellido_paterno || null, b.apellido_materno || null, b.parentesco || null, b.telefono || null]
        )
      } catch {}
    }
  }

  return { success: true, paciente: result.rows[0] }
})
