import { verifyAdminToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  await verifyAdminToken(event)

  const result = await pool.query(
    `SELECT clave, valor, valor_encriptado, descripcion, tipo
     FROM configuracion_sistema
     WHERE categoria = 'whatsapp'
     ORDER BY clave`
  )

  const config: Record<string, any> = {}
  for (const row of result.rows) {
    config[row.clave] = {
      valor: row.valor || '',
      descripcion: row.descripcion,
      tipo: row.tipo,
    }
  }

  return { configuracion: config }
})
