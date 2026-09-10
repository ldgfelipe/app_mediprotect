import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const { tabla } = getRouterParams(event)
  const body = await readBody(event)
  const confirm = body.confirm || ''

  if (confirm !== tabla) {
    throw createError({
      statusCode: 400,
      message: `Confirma la limpieza enviando confirm="${tabla}" en el cuerpo de la solicitud`
    })
  }

  const pool = useDbPool()
  const safe = /^[a-z_]+$/.test(tabla)
  if (!safe) throw createError({ statusCode: 400, message: 'Nombre de tabla inválido' })

  const colRes = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name=$1`,
    [tabla]
  )
  if (colRes.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Tabla no encontrada' })
  }

  const result = await pool.query(`DELETE FROM ${tabla} RETURNING COUNT(*)::int as deleted`)
  const deleted = parseInt(result.rows[0]?.deleted || 0)

  return { tabla, deleted, message: `Se eliminaron ${deleted} filas de ${tabla}` }
})
