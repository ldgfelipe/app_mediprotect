const CURP_API_BASE = 'https://api.valida-curp.com.mx/curp/obtener_datos/'

interface ConfigCurp {
  enabled: boolean
  modo: string
  token: string
}

export async function obtenerConfigCurp(pool: any): Promise<ConfigCurp> {
  const cfg: ConfigCurp = {
    enabled: true,
    modo: 'prueba',
    token: useRuntimeConfig().validaCurpToken || 'pruebas',
  }

  try {
    const r = await pool.query(
      `SELECT clave, valor FROM configuracion_sistema
       WHERE clave IN ('curp_enabled', 'curp_modo', 'curp_api_key', 'curp_test_token')`
    )
    const map: Record<string, string> = {}
    for (const row of r.rows) map[row.clave] = row.valor

    if (map.curp_enabled === 'false') cfg.enabled = false
    cfg.modo = map.curp_modo || 'prueba'
    const k = cfg.modo === 'produccion' ? map.curp_api_key : map.curp_test_token
    if (k && k.trim()) cfg.token = k.trim()
  } catch (e: any) {
    console.error('[CURP] No se pudo leer configuracion:', e?.message)
  }

  return cfg
}

function esPayloadInvalido(datos: any, curp: string): boolean {
  if (!datos || typeof datos !== 'object') return true
  if (datos.error) return true
  const sol = datos?.response?.Solicitante
  if (!sol) return true
  if (sol.CURP && String(sol.CURP).toUpperCase() !== curp) return true
  if (/prueba/i.test(String(sol.Nombres || ''))) return true
  return false
}

async function guardarCache(pool: any, curp: string, datos: any) {
  try {
    await pool.query(
      `INSERT INTO curp_cache (curp, datos) VALUES ($1, $2)
       ON CONFLICT (curp) DO UPDATE SET datos = EXCLUDED.datos, created_at = NOW()`,
      [curp, datos]
    )
  } catch (e: any) {
    console.error('[CURP] No se pudo guardar cache:', e?.message)
  }
}

export async function purgarCacheCurp(pool: any): Promise<number> {
  try {
    const r = await pool.query('DELETE FROM curp_cache')
    return r.rowCount || 0
  } catch (e: any) {
    console.error('[CURP] No se pudo purgar cache:', e?.message)
    return 0
  }
}

export async function consultarCurp(pool: any, curp: string): Promise<any> {
  const cfg = await obtenerConfigCurp(pool)

  if (!cfg.enabled) {
    throw createError({ statusCode: 503, message: 'La validacion CURP esta deshabilitada' })
  }

  const cached = await pool.query('SELECT datos FROM curp_cache WHERE curp = $1', [curp])
  const datos = cached.rows[0]?.datos
  if (datos && !esPayloadInvalido(datos, curp)) return datos

  const url = `${CURP_API_BASE}?token=${encodeURIComponent(cfg.token)}&curp=${encodeURIComponent(curp)}`

  let respuesta: any
  try {
    respuesta = await $fetch<any>(url)
  } catch (e: any) {
    const cuerpo = e?.data
    const mensaje =
      cuerpo?.error_message ||
      cuerpo?.message ||
      e?.message ||
      'Error al consultar CURP'
    console.error(`[CURP] Fallo consulta ${curp} (modo=${cfg.modo}): ${mensaje}`)
    throw createError({ statusCode: e?.status || 502, message: mensaje })
  }

  if (respuesta?.error) {
    if (!respuesta.error_msg) respuesta.error_msg = respuesta.error_message || 'CURP no encontrada'
    throw createError({ statusCode: 400, message: respuesta.error_msg })
  }

  await guardarCache(pool, curp, respuesta)
  return respuesta
}
