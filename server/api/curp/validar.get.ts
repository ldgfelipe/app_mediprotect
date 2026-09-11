export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const curp = (query.curp as string || '').toUpperCase().trim()

  if (!curp || curp.length !== 18) {
    throw createError({ statusCode: 400, message: 'La CURP debe tener exactamente 18 caracteres' })
  }

  const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/
  if (!curpRegex.test(curp)) {
    throw createError({ statusCode: 400, message: 'Formato de CURP invalido' })
  }

  const pool = await useDbPool(event)

  const cached = await pool.query('SELECT datos FROM curp_cache WHERE curp = $1', [curp])
  if (cached.rows.length > 0) {
    return cached.rows[0].datos
  }

  let token = config.validaCurpToken || 'pruebas'
  try {
    const dbConfig = await pool.query(
      "SELECT clave, valor FROM configuracion_sistema WHERE clave IN ('curp_enabled', 'curp_modo', 'curp_api_key', 'curp_test_token')"
    )
    const configMap: Record<string, string> = {}
    for (const row of dbConfig.rows) {
      configMap[row.clave] = row.valor
    }

    if (configMap.curp_enabled === 'false') {
      throw createError({ statusCode: 503, message: 'La validacion CURP esta deshabilitada' })
    }

    const modo = configMap.curp_modo || 'prueba'

    if (modo === 'produccion') {
      if (configMap.curp_api_key) {
        token = configMap.curp_api_key
      }
    } else {
      if (configMap.curp_test_token) {
        token = configMap.curp_test_token
      }
    }
  } catch (e: any) {
    if (e.statusCode === 503) throw e
  }

  const url = `https://api.valida-curp.com.mx/curp/obtener_datos/?token=${token}&curp=${curp}`

  try {
    const response = await $fetch<any>(url)
    await pool.query(
      'INSERT INTO curp_cache (curp, datos) VALUES ($1, $2) ON CONFLICT (curp) DO UPDATE SET datos = $2, created_at = NOW()',
      [curp, response]
    )
    return response
  } catch (e: any) {
    await pool.query(
      'INSERT INTO curp_cache (curp, datos) VALUES ($1, $2) ON CONFLICT (curp) DO UPDATE SET datos = $2, created_at = NOW()',
      [curp, { error: true, message: e?.message || 'Error al consultar CURP', statusCode: e?.status || 500 }]
    )
    throw createError({ statusCode: e?.status || 500, message: e?.message || 'Error al consultar CURP' })
  }
})