
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const body = await readBody(event)
  const { configuracion } = body

  if (!configuracion || typeof configuracion !== 'object') {
    throw createError({ statusCode: 400, message: 'Configuración inválida' })
  }

  const pool = useDbPool(event)

  const upsert = async (clave: string, valor: string, tipo: string) => {
    const result = await pool.query(
      `UPDATE configuracion_sistema SET valor = $1, tipo = $2, categoria = 'smtp', updated_at = NOW()
       WHERE clave = $3 RETURNING id`,
      [valor, tipo, clave]
    )
    if (result.rowCount === 0) {
      await pool.query(
        `INSERT INTO configuracion_sistema (clave, valor, tipo, categoria)
         VALUES ($1, $2, $3, 'smtp')`,
        [clave, valor, tipo]
      )
    }
  }

  await upsert('smtp_enabled', configuracion.enabled ? 'true' : 'false', 'boolean')
  await upsert('smtp_host', (configuracion.host || '').trim(), 'text')
  await upsert('smtp_port', String(configuracion.port || 465), 'text')
  await upsert('smtp_user', (configuracion.user || '').trim(), 'text')
  await upsert('smtp_from', (configuracion.from || '').trim(), 'text')

  // La contraseña solo se actualiza si viene un valor real (no el placeholder de campo oculto)
  const pass = configuracion.pass
  if (pass && pass !== '********' && !pass.includes('...')) {
    await upsert('smtp_pass', pass.trim(), 'password')
  }

  return { success: true, mensaje: 'Configuración SMTP guardada correctamente' }
})