
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const body = await readBody(event)
  const { configuraciones } = body

  if (!Array.isArray(configuraciones)) {
    throw createError({ statusCode: 400, message: 'Se esperaba un array de configuraciones' })
  }

  const pool = await useDbPool(event)
  let actualizados = 0

  for (const config of configuraciones) {
    const { clave, valor } = config
    if (!clave) continue

    // Primero intentar actualizar (incluye claves que esten en cualquier categoria)
    const result = await pool.query(
      `UPDATE configuracion_sistema SET valor = $1, categoria = 'sms', updated_at = NOW()
       WHERE clave = $2
       RETURNING id`,
      [valor || '', clave]
    )

    if (result.rowCount === 0) {
      // No existe, insertar
      const tipo = clave.includes('token') || clave.includes('auth') || clave.includes('secret') ? 'password' : 'texto'
      await pool.query(
        `INSERT INTO configuracion_sistema (clave, valor, categoria, tipo)
         VALUES ($1, $2, 'sms', $3)`,
        [clave, valor || '', tipo]
      )
    }
    actualizados++
  }

  return { success: true, actualizados }
})
