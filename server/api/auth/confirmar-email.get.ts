import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = query.token as string
  const tipo = query.tipo as string

  if (!token || !tipo) {
    throw createError({ statusCode: 400, message: 'Token y tipo son requeridos' })
  }

  if (!['medico', 'paciente', 'empresa'].includes(tipo)) {
    throw createError({ statusCode: 400, message: 'Tipo inválido' })
  }

  const pool = await useDbPool(event)

  const tabla = tipo === 'medico' ? 'medicos' : tipo === 'paciente' ? 'pacientes' : 'empresas'
  const selectUsuario = tipo === 'empresa'
    ? 'SELECT id, nombre, contacto_nombre AS apellido, email, email_confirmado FROM empresas WHERE id = $1'
    : `SELECT id, nombre, apellido, email, email_confirmado FROM ${tabla} WHERE id = $1`

  const tokenResult = await pool.query(
    `SELECT id_usuario, tipo_usuario, email, expira_en, used
     FROM email_confirmacion_tokens
     WHERE token = $1 AND tipo_usuario = $2`,
    [token, tipo]
  )

  if (tokenResult.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Token no válido' })
  }

  const tokenData = tokenResult.rows[0]

  if (tokenData.used) {
    const table = tabla
    const userResult = await pool.query(
      selectUsuario,
      [tokenData.id_usuario]
    )
    const userToken = jwt.sign(
      { id: tokenData.id_usuario, email: tokenData.email, tipo },
      process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )
    return {
      mensaje: 'Este correo ya fue confirmado anteriormente',
      already_confirmed: true,
      email: tokenData.email,
      tipo,
      usuario: userResult.rows[0] || null,
      token: userToken
    }
  }

  if (new Date(tokenData.expira_en) < new Date()) {
    throw createError({ statusCode: 400, message: 'El token ha expirado. Solicita uno nuevo.' })
  }

  await pool.query(
    'UPDATE email_confirmacion_tokens SET used = true WHERE token = $1',
    [token]
  )

  const table = tabla
  await pool.query(
    `UPDATE ${table} SET email_confirmado = true WHERE id = $1`,
    [tokenData.id_usuario]
  )

  const userResult = await pool.query(
    selectUsuario,
    [tokenData.id_usuario]
  )

  const userToken = jwt.sign(
    { id: tokenData.id_usuario, email: tokenData.email, tipo },
    process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  return {
    mensaje: 'Correo confirmado exitosamente',
    email: tokenData.email,
    tipo,
    usuario: userResult.rows[0],
    token: userToken
  }
})