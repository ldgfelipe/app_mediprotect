import { verifyAdminToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  await verifyAdminToken(event)

  const body = await readBody(event)
  const { configuraciones } = body

  if (!configuraciones || !Array.isArray(configuraciones)) {
    throw createError({ statusCode: 400, message: 'Configuraciones inválidas' })
  }

  for (const config of configuraciones) {
    await pool.query(
      `INSERT INTO configuracion_sistema (clave, valor, categoria, updated_at)
       VALUES ($1, $2, 'whatsapp', NOW())
       ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()`,
      [config.clave, config.valor]
    )
  }

  return { ok: true }
})
