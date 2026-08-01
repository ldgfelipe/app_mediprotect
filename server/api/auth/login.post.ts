import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  try {
    const { email, usuario, password, tipo } = await readBody(event)
    const identificador = usuario || email

    if (!tipo || !['paciente', 'medico'].includes(tipo)) {
      throw createError({ statusCode: 400, message: 'Tipo inválido' })
    }
    if (!identificador || !password) {
      throw createError({ statusCode: 400, message: 'Usuario y contraseña son requeridos' })
    }

    const pool = getPool()
    const table = tipo === 'paciente' ? 'pacientes' : 'medicos'
    const result = await pool.query(
      tipo === 'medico'
        ? `SELECT * FROM ${table} WHERE email = $1 OR usuario = $1`
        : `SELECT * FROM ${table} WHERE email = $1`,
      [identificador]
    )

    if (result.rows.length === 0) {
      throw createError({ statusCode: 401, message: 'Credenciales inválidas' })
    }

    const registro = result.rows[0]
    const valida = await bcrypt.compare(password, registro.password_hash)
    if (!valida) {
      throw createError({ statusCode: 401, message: 'Credenciales inválidas' })
    }

    const token = jwt.sign(
      { id: registro.id, email: registro.email, tipo },
      process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    const { password_hash, ...usuarioSinPass } = registro
    return { usuario: { ...usuarioSinPass, tipo }, token }
  } catch (error: any) {
    console.error('Login error:', error)
    throw error.statusCode ? error : createError({ statusCode: 500, message: error.message || 'Error interno del servidor' })
  }
})
