import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  const pool = getPool()
  const body = await readBody(event)

  if (decoded.tipo === 'medico') {
    const { nombre, apellido, telefono, cedula_profesional, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio, foto_url } = body
    const result = await pool.query(
      `UPDATE medicos SET nombre = COALESCE($1, nombre), apellido = COALESCE($2, apellido),
       telefono = COALESCE($3, telefono), cedula_profesional = COALESCE($4, cedula_profesional),
       consultorio_direccion = COALESCE($5, consultorio_direccion),
       consultorio_ciudad = COALESCE($6, consultorio_ciudad),
       consultorio_estado = COALESCE($7, consultorio_estado),
       bio = COALESCE($8, bio), foto_url = COALESCE($9, foto_url),
       updated_at = NOW()
       WHERE id = $10 RETURNING id, nombre, apellido, email, telefono, cedula_profesional, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio, foto_url, created_at`,
      [nombre, apellido, telefono, cedula_profesional, consultorio_direccion, consultorio_ciudad, consultorio_estado, bio, foto_url, decoded.id]
    )
    if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'No encontrado' })
    return { usuario: result.rows[0] }
  }

  const { nombre, apellido, telefono, fecha_nacimiento, genero, direccion, ciudad, beneficiario_nombre, beneficiario_parentesco, beneficiario_telefono, estudios } = body
  const result = await pool.query(
    `UPDATE pacientes SET nombre = COALESCE($1, nombre), apellido = COALESCE($2, apellido),
     telefono = COALESCE($3, telefono), fecha_nacimiento = COALESCE($4, fecha_nacimiento),
     genero = COALESCE($5, genero), direccion = COALESCE($6, direccion),
     ciudad = COALESCE($7, ciudad),
     beneficiario_nombre = COALESCE($8, beneficiario_nombre),
     beneficiario_parentesco = COALESCE($9, beneficiario_parentesco),
     beneficiario_telefono = COALESCE($10, beneficiario_telefono),
     updated_at = NOW()
     WHERE id = $11 RETURNING id, nombre, apellido, email, telefono, fecha_nacimiento, genero, direccion, ciudad,
     beneficiario_nombre, beneficiario_parentesco, beneficiario_telefono, created_at`,
    [nombre, apellido, telefono, fecha_nacimiento, genero, direccion, ciudad, beneficiario_nombre, beneficiario_parentesco, beneficiario_telefono, decoded.id]
  )
  if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'No encontrado' })

  if (estudios !== undefined) {
    await pool.query(
      `UPDATE pacientes SET estudios = $1 WHERE id = $2`,
      [JSON.stringify(estudios), decoded.id]
    )
  }

  const usuario = result.rows[0]
  if (estudios !== undefined) usuario.estudios = estudios

  return { usuario }
})
