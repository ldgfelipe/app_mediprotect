
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const { tabla } = getRouterParams(event)
  const body = await readBody(event)
  const confirm = body.confirm || ''

  if (confirm !== tabla) {
    throw createError({
      statusCode: 400,
      message: `Confirma la limpieza enviando confirm="${tabla}" en el cuerpo de la solicitud`
    })
  }

  const pool = useDbPool(event)
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
