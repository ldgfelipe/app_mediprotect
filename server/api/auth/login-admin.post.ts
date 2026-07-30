import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  try {
    const { email, password } = await readBody(event)
    const pool = getPool()

    const result = await pool.query(`
      SELECT u.*, r.nombre as rol_nombre
      FROM usuarios_sistema u
      JOIN roles r ON r.id = u.id_rol
      WHERE u.email = $1 AND u.activo = true
    `, [email])

    if (!result.rows.length) {
      throw createError({ statusCode: 401, message: 'Credenciales inválidas' })
    }

    const usuario = result.rows[0]
    const valida = await bcrypt.compare(password, usuario.password_hash)
    if (!valida) {
      throw createError({ statusCode: 401, message: 'Credenciales inválidas' })
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, tipo: usuario.rol_nombre === 'Administrador' ? 'admin' : usuario.rol_nombre, rol: usuario.rol_nombre },
      process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026',
      { expiresIn: '24h' }
    )

    const { password_hash, ...usuarioSinPass } = usuario
    return { usuario: usuarioSinPass, token }
  } catch (error: any) {
    console.error('Admin login error:', error)
    throw error.statusCode ? error : createError({ statusCode: 500, message: error.message || 'Error interno del servidor' })
  }
})
