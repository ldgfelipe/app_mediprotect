import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inv�lido' }) }

  const pool = useDbPool(event)
  const result = await pool.query(
    `SELECT clave, valor, valor_encriptado, descripcion, categoria, tipo, updated_at
     FROM configuracion_sistema
     WHERE categoria = 'pagos'
     ORDER BY clave`
  )

  // Enmascarar API keys para seguridad
  const config = result.rows.map((row: any) => ({
    ...row,
    valor_display: row.tipo === 'password' && row.valor
      ? row.valor.substring(0, 8) + '...' + row.valor.substring(row.valor.length - 4)
      : row.valor,
    tiene_valor: !!row.valor
  }))

  return { configuracion: config }
})
