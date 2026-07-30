import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  try {
    const { email, password, tipo } = await readBody(event)

    if (!tipo || !['paciente', 'medico'].includes(tipo)) {
      throw createError({ statusCode: 400, message: 'Tipo inválido' })
    }

    const pool = getPool()
    const table = tipo === 'paciente' ? 'pacientes' : 'medicos'
    const result = await pool.query(`SELECT * FROM ${table} WHERE email = $1`, [email])

    if (result.rows.length === 0) {
      throw createError({ statusCode: 401, message: 'Credenciales inválidas' })
    }

    const usuario = result.rows[0]
    const valida = await bcrypt.compare(password, usuario.password_hash)
    if (!valida) {
      throw createError({ statusCode: 401, message: 'Credenciales inválidas' })
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, tipo },
      process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    const { password_hash, ...usuarioSinPass } = usuario
    return { usuario: { ...usuarioSinPass, tipo }, token }
  } catch (error: any) {
    console.error('Login error:', error)
    throw error.statusCode ? error : createError({ statusCode: 500, message: error.message || 'Error interno del servidor' })
  }
})
