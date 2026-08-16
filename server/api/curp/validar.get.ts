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

  // Leer configuracion de la BD (configuracion del admin)
  let token = config.validaCurpToken || 'pruebas'
  try {
    const pool = getPool()
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
      // Modo produccion: usar API key real
      if (configMap.curp_api_key) {
        token = configMap.curp_api_key
      }
    } else {
      // Modo prueba: usar token de prueba
      if (configMap.curp_test_token) {
        token = configMap.curp_test_token
      }
    }
  } catch (e: any) {
    if (e.statusCode === 503) throw e
    // Si hay error, usar el token del .env como fallback
  }

  const url = `https://api.valida-curp.com.mx/curp/obtener_datos/?token=${token}&curp=${curp}`

  try {
    const response = await $fetch<any>(url)
    return response
  } catch (e: any) {
    throw createError({ statusCode: e?.status || 500, message: e?.message || 'Error al consultar CURP' })
  }
})
