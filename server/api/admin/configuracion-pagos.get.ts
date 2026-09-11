
export default defineEventHandler(async (event) => {
const _user = verifyAdminOrAsistenteToken(event)

  const pool = await useDbPool(event)
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
