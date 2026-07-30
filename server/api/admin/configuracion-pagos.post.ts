import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const body = await readBody(event)
  const { configuraciones } = body

  if (!configuraciones || !Array.isArray(configuraciones)) {
    throw createError({ statusCode: 400, message: 'Formato inválido' })
  }

  const pool = getPool()
  const resultados: any[] = []

  for (const config of configuraciones) {
    const { clave, valor } = config
    if (!clave) continue

    const result = await pool.query(
      `UPDATE configuracion_sistema
       SET valor = $1, updated_at = NOW()
       WHERE clave = $2 AND categoria = 'pagos'
       RETURNING id, clave, valor, tipo, categoria`,
      [valor || '', clave]
    )

    if (result.rowCount > 0) {
      resultados.push(result.rows[0])
    }
  }

  return { success: true, actualizados: resultados.length, configuracion: resultados }
})
