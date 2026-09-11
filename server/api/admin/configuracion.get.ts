
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const query = getQuery(event)
  const categoria = query.categoria as string

  const pool = await useDbPool(event)
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
