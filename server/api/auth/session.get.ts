import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { autenticado: false }
  }

  try {
    const payload = jwt.verify(
      authHeader.split(' ')[1],
      process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026'
    ) as { id: string; email: string; tipo: string }

    const pool = getPool()
    const table = payload.tipo === 'medico' ? 'medicos' : 'pacientes'

    const result = await pool.query(
      `SELECT id, nombre, apellido, email, telefono FROM ${table} WHERE id = $1`,
      [payload.id]
    )

    if (result.rows.length === 0) {
      return { autenticado: false }
    }

    const user = result.rows[0]
    return {
      autenticado: true,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        telefono: user.telefono,
        tipo: payload.tipo,
      }
    }
  } catch {
    return { autenticado: false }
  }
})
