import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inv�lido' }) }

  const query = getQuery(event)
  const categoria = query.categoria as string

  const pool = useDbPool(event)
  let result
  if (categoria) {
    result = await pool.query(
      'SELECT id, clave, valor, valor_encriptado, descripcion, categoria, tipo, updated_at FROM configuracion_sistema WHERE categoria = $1 ORDER BY clave',
      [categoria]
    )
  } else {
    result = await pool.query(
      'SELECT id, clave, valor, valor_encriptado, descripcion, categoria, tipo, updated_at FROM configuracion_sistema ORDER BY categoria, clave'
    )
  }

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
