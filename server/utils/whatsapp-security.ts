const MAX_INTENTOS = 5
const VENTANA_MS = 10 * 1000

export async function permiteMensaje(pool: any, telefono: string): Promise<boolean> {
  const ahora = new Date()

  const res = await pool.query(
    `SELECT intentos, ventana_inicio FROM whatsapp_rate_limit WHERE telefono = $1`,
    [telefono]
  )
  const fila = res.rows[0]

  if (!fila) {
    await pool.query(
      `INSERT INTO whatsapp_rate_limit (telefono, intentos, ventana_inicio)
       VALUES ($1, 1, $2)
       ON CONFLICT (telefono) DO NOTHING`,
      [telefono, ahora]
    )
    return true
  }

  const transcurrido = ahora.getTime() - new Date(fila.ventana_inicio).getTime()
  if (transcurrido >= VENTANA_MS) {
    await pool.query(
      `UPDATE whatsapp_rate_limit SET intentos = 1, ventana_inicio = $1 WHERE telefono = $2`,
      [ahora, telefono]
    )
    return true
  }

  if (fila.intentos >= MAX_INTENTOS) {
    return false
  }

  await pool.query(
    `UPDATE whatsapp_rate_limit SET intentos = intentos + 1 WHERE telefono = $1`,
    [telefono]
  )
  return true
}