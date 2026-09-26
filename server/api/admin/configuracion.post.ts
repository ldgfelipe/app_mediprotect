
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const body = await readBody(event)
  const { configuraciones } = body

  if (!configuraciones || !Array.isArray(configuraciones)) {
    throw createError({ statusCode: 400, message: 'Formato inválido' })
  }

  const pool = await useDbPool(event)
  const resultados: any[] = []

  for (const config of configuraciones) {
    const { clave, valor } = config
    if (!clave) continue

    // Intentar UPDATE primero, si no existe hacer INSERT
    let result = await pool.query(
      `UPDATE configuracion_sistema
       SET valor = $1, updated_at = NOW()
       WHERE clave = $2
       RETURNING id, clave, valor, tipo, categoria`,
      [valor || '', clave]
    )

    if (result.rowCount === 0) {
      result = await pool.query(
        `INSERT INTO configuracion_sistema (clave, valor, tipo, categoria)
         VALUES ($1, $2, 'text', 'general')
         RETURNING id, clave, valor, tipo, categoria`,
        [clave, valor || '']
      )
    }

    resultados.push(result.rows[0])
  }

  if (configuraciones.some((c: any) => String(c?.clave || '').startsWith('curp_'))) {
    const purgados = await purgarCacheCurp(pool)
    console.log(`[CURP] Config cambiada, cache purgada: ${purgados} entradas`)
  }

  return { success: true, actualizados: resultados.length, configuracion: resultados }
})
