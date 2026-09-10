import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  const pool = useDbPool(event)
  const body = await readBody(event)

  // Obtener telefono actual para comparar
  const currentResult = await pool.query(
    `SELECT telefono FROM ${decoded.tipo === 'medico' ? 'medicos' : 'pacientes'} WHERE id = $1`,
    [decoded.id]
  )
  const currentPhone = currentResult.rows[0]?.telefono || ''
  const normalize = (t: string) => (t || '').replace(/[^0-9]/g, '').slice(-10)

  if (decoded.tipo === 'medico') {
    const { nombre, apellido, telefono, cedula_profesional, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio, foto_url, apellido_paterno, apellido_materno, rfc, hospital_consultorio, tipo_consulta, curp, codigo_postal, colonia, comision_tipo, estudios } = body
    const curpUpper = (curp || '').toUpperCase().trim()
    const phoneChanged = telefono && normalize(telefono) !== normalize(currentPhone)
    const resetPhone = phoneChanged ? ', telefono_confirmado = false' : ''
    const result = await pool.query(
      `UPDATE medicos SET nombre = COALESCE($1, nombre), apellido = COALESCE($2, apellido),
       telefono = COALESCE($3, telefono), cedula_profesional = COALESCE($4, cedula_profesional),
       consultorio_direccion = COALESCE($5, consultorio_direccion),
       consultorio_ciudad = COALESCE($6, consultorio_ciudad),
       consultorio_estado = COALESCE($7, consultorio_estado),
       bio = COALESCE($8, bio), foto_url = COALESCE($9, foto_url),
       apellido_paterno = COALESCE($10, apellido_paterno),
       apellido_materno = COALESCE($11, apellido_materno),
       rfc = COALESCE($12, rfc),
       hospital_consultorio = COALESCE($13, hospital_consultorio),
       tipo_consulta = COALESCE($14, tipo_consulta),
       curp = COALESCE($15, curp),
       codigo_postal = COALESCE($16, codigo_postal),
       colonia = COALESCE($17, colonia),
       comision_tipo = COALESCE($18, comision_tipo),
       updated_at = NOW()
       ${resetPhone}
       WHERE id = $19 RETURNING id, nombre, apellido, email, email_confirmado, telefono, telefono_confirmado, cedula_profesional, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio, foto_url, created_at,
               apellido_paterno, apellido_materno, rfc, hospital_consultorio, tipo_consulta, curp, codigo_postal, colonia, comision_tipo`,
      [nombre, apellido, telefono, cedula_profesional, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio, foto_url, apellido_paterno || apellido || null, apellido_materno || null, rfc || null, hospital_consultorio || null, tipo_consulta || null, curpUpper || null, codigo_postal || null, colonia || null, comision_tipo || null, decoded.id]
    )
    if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'No encontrado' })

    if (estudios !== undefined) {
      await pool.query('UPDATE medicos SET estudios = $1 WHERE id = $2', [JSON.stringify(estudios), decoded.id])
      result.rows[0].estudios = estudios
    }

    return { usuario: { ...result.rows[0], tipo: 'medico' } }
  }

  const { nombre, apellido, telefono, fecha_nacimiento, genero, direccion, ciudad, beneficiario_nombre, beneficiario_parentesco, beneficiario_telefono, estudios,
    estado_civil, ocupacion, beneficiarios } = body
  const phoneChanged = telefono && normalize(telefono) !== normalize(currentPhone)
  const resetPhone = phoneChanged ? ', telefono_confirmado = false' : ''
  const result = await pool.query(
    `UPDATE pacientes SET nombre = COALESCE($1, nombre), apellido = COALESCE($2, apellido),
     telefono = COALESCE($3, telefono), fecha_nacimiento = COALESCE($4, fecha_nacimiento),
     genero = COALESCE($5, genero), direccion = COALESCE($6, direccion),
     ciudad = COALESCE($7, ciudad),
     beneficiario_nombre = COALESCE($8, beneficiario_nombre),
     beneficiario_parentesco = COALESCE($9, beneficiario_parentesco),
     beneficiario_telefono = COALESCE($10, beneficiario_telefono),
     estado_civil = COALESCE($11, estado_civil),
     ocupacion = COALESCE($12, ocupacion),
     updated_at = NOW()
     ${resetPhone}
     WHERE id = $13 RETURNING id, nombre, apellido, email, email_confirmado, telefono, telefono_confirmado, fecha_nacimiento, genero, direccion, ciudad,
     curp, estado_civil, ocupacion, como_nos_conociste,
     beneficiario_nombre, beneficiario_parentesco, beneficiario_telefono,
     identificacion_tipo, identificacion_numero, acepta_seguro, plan_contratado, created_at`,
    [nombre, apellido, telefono, fecha_nacimiento, genero, direccion, ciudad, beneficiario_nombre, beneficiario_parentesco, beneficiario_telefono,
      estado_civil || null, ocupacion || null,
      decoded.id]
  )
  if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'No encontrado' })

  if (estudios !== undefined) {
    await pool.query(
      `UPDATE pacientes SET estudios = $1 WHERE id = $2`,
      [JSON.stringify(estudios), decoded.id]
    )
  }

  if (Array.isArray(beneficiarios)) {
    await pool.query('DELETE FROM beneficiarios_paciente WHERE id_paciente = $1', [decoded.id])
    for (const b of beneficiarios) {
      try {
        await pool.query(
          `INSERT INTO beneficiarios_paciente (id_paciente, nombre, apellido_paterno, apellido_materno, parentesco, telefono)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [decoded.id, b.nombre, b.apellido_paterno || null, b.apellido_materno || null, b.parentesco || null, b.telefono || null]
        )
      } catch {}
    }
  }

  const usuario = { ...result.rows[0], tipo: 'paciente' }
  if (estudios !== undefined) usuario.estudios = estudios

  return { usuario }
})
