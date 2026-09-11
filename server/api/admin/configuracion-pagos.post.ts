
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const body = await readBody(event)
  const { configuraciones } = body

  if (!configuraciones || !Array.isArray(configuraciones)) {
    throw createError({ statusCode: 400, message: 'Formato inv�lido' })
  }

  const pool = useDbPool(event)
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
