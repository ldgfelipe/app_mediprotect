
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const pool = await useDbPool(event)

  const result = await pool.query(
    "SELECT clave, valor, valor_encriptado, descripcion, tipo FROM configuracion_sistema WHERE categoria = 'sms'"
  )

  const configuracion = result.rows.map((row: any) => ({
    clave: row.clave,
    valor: row.tipo === 'password' && row.valor
      ? row.valor.substring(0, 8) + '...' + row.valor.slice(-4)
      : row.valor,
    valor_display: row.tipo === 'password'
      ? (row.valor ? 'Configurado' : 'No configurado')
      : row.valor,
    tiene_valor: !!row.valor,
    descripcion: row.descripcion,
    tipo: row.tipo
  }))

  return { configuracion }
})
