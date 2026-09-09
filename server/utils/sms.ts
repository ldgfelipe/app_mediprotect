import { Pool } from 'pg'

let transporter: any = null

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
})

export interface SmsConexion {
  id: number
  nombre: string
  proveedor: string
  account_sid: string
  auth_token: string
  from_number: string
  api_url: string
  metodo: string
  modo: string
  activa: boolean
  preferida: boolean
  prioridad: number
}

export interface SmsConfig {
  provider: string
  account_sid: string
  auth_token: string
  from_number: string
  api_url: string
  metodo: string
  modo: string
}

async function getConexionesActivas(): Promise<SmsConexion[]> {
  const result = await pool.query(
    'SELECT id, nombre, proveedor, account_sid, auth_token, from_number, api_url, metodo, modo, activa, preferida, prioridad FROM sms_conexiones WHERE activa = true ORDER BY preferida DESC, prioridad ASC, created_at ASC'
  )
  return result.rows
}

async function getSmsConfig(): Promise<SmsConfig> {
  const conexiones = await getConexionesActivas()
  if (conexiones.length > 0) {
    const c = conexiones[0]
    return { provider: c.proveedor, account_sid: c.account_sid, auth_token: c.auth_token, from_number: c.from_number, api_url: c.api_url, metodo: c.metodo || 'POST', modo: c.modo }
  }
  // Fallback a configuracion antigua
  const result = await pool.query(
    "SELECT clave, valor FROM configuracion_sistema WHERE categoria = 'sms' AND clave IN ('sms_provider', 'sms_twilio_account_sid', 'sms_twilio_auth_token', 'sms_twilio_from_number', 'sms_modo')"
  )
  const configMap: Record<string, string> = {}
  for (const row of result.rows) { configMap[row.clave] = row.valor }
  return {
    provider: configMap.sms_provider || 'twilio',
    account_sid: configMap.sms_twilio_account_sid || '',
    auth_token: configMap.sms_twilio_auth_token || '',
    from_number: configMap.sms_twilio_from_number || '',
    api_url: '',
    modo: configMap.sms_modo || 'sandbox'
  }
}

function generarCodigo(longitud: number = 6): string {
  let codigo = ''
  for (let i = 0; i < longitud; i++) {
    codigo += Math.floor(Math.random() * 10).toString()
  }
  return codigo
}

async function enviarSmsTwilio(
  config: SmsConfig,
  telefono: string,
  mensaje: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!config.account_sid || !config.auth_token || !config.from_number) {
    return { success: false, error: 'Twilio no esta configurado. Configura Account SID, Auth Token y numero.' }
  }

  try {
    const twilio = await import('twilio').then(m => m.default)
    const client = twilio(config.account_sid, config.auth_token)

    const msg = await client.messages.create({
      body: mensaje,
      from: config.from_number,
      to: telefono
    })

    return { success: true, sid: msg.sid }
  } catch (err: any) {
    console.error('Error enviando SMS via Twilio:', err.message)
    return { success: false, error: err.message }
  }
}

export function normalizarTelefonoMX(telefono: string): string {
  let limpio = telefono.replace(/[^0-9]/g, '')
  if (limpio.startsWith('52') && limpio.length >= 12) {
    return '+' + limpio
  }
  if (limpio.length === 10) {
    return '+52' + limpio
  }
  if (telefono.startsWith('+')) return telefono
  return '+' + limpio
}

async function enviarSmsApiRest(
  config: SmsConfig & { metodo?: string },
  telefono: string,
  mensaje: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const url = (config.api_url || config.account_sid || '').trim()
  if (!url) {
    return { success: false, error: 'API REST sin configurar. Agrega la URL de la API.' }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.auth_token) headers['Authorization'] = `Bearer ${config.auth_token}`

  const payload: Record<string, any> = {
    to: telefono,
    phone: telefono,
    telefono,
    message: mensaje,
    mensaje,
    text: mensaje,
    from: config.from_number || '',
  }

  const metodo = (config.metodo || 'POST').toUpperCase()

  try {
    let res: Response
    if (metodo === 'GET') {
      const qs = new URLSearchParams()
      qs.set('to', telefono)
      qs.set('telefono', telefono)
      qs.set('message', mensaje)
      qs.set('mensaje', mensaje)
      qs.set('descripcion', mensaje)
      if (config.from_number) qs.set('from', config.from_number)
      res = await fetch(`${url}${url.includes('?') ? '&' : '?'}${qs.toString()}`, {
        method: 'GET', headers, signal: AbortSignal.timeout(15000)
      })
    } else {
      res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) })
    }
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '')
      return { success: false, error: `API REST respondio ${res.status}: ${bodyText.slice(0, 200)}` }
    }
    return { success: true, sid: `rest-${Date.now()}` }
  } catch (err: any) {
    return { success: false, error: `Error conectando a la API REST: ${err.message}` }
  }
}

async function enviarSmsConConexion(
  conexion: SmsConexion | SmsConfig,
  telefono: string,
  mensaje: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const config: SmsConfig = {
    provider: conexion.proveedor || (conexion as SmsConfig).provider || 'twilio',
    account_sid: conexion.account_sid,
    auth_token: conexion.auth_token,
    from_number: conexion.from_number,
    api_url: conexion.api_url || '',
    metodo: conexion.metodo || 'POST',
    modo: conexion.modo || 'sandbox'
  }

  switch (config.provider) {
    case 'twilio':
      return await enviarSmsTwilio(config, telefono, mensaje)
    case 'api_rest':
    case 'rest':
      return await enviarSmsApiRest(config, telefono, mensaje)
    default:
      return { success: false, error: `Proveedor '${config.provider}' no soportado` }
  }
}

export async function enviarSms(telefono: string, mensaje: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const telefonoNormalizado = normalizarTelefonoMX(telefono)
  const conexiones = await getConexionesActivas()

  if (conexiones.length > 0) {
    // Failover: intentar con cada conexion activa en orden de prioridad
    for (const conexion of conexiones) {
      const result = await enviarSmsConConexion(conexion, telefonoNormalizado, mensaje)

      // Log cada intento
      try {
        await pool.query(
          'INSERT INTO sms_log (telefono, mensaje, proveedor, estado, error_mensaje) VALUES ($1, $2, $3, $4, $5)',
          [telefono, mensaje, `${conexion.proveedor} (${conexion.nombre})`, result.success ? 'enviado' : 'error', result.error || null]
        )
      } catch (e) {
        console.error('Error guardando log SMS:', e)
      }

      if (result.success) {
        return result
      }

      console.error(`Conexion "${conexion.nombre}" fallo: ${result.error}. Intentando siguiente...`)
    }

    // Todas las conexiones fallaron
    return { success: false, error: `Todas las conexiones SMS fallaron. Ultimo error:Intento con ${conexiones.length} proveedor(es)` }
  }

  // Fallback: config antigua
  const config = await getSmsConfig()
  const result = await enviarSmsConConexion(config as any, telefonoNormalizado, mensaje)

  try {
    await pool.query(
      'INSERT INTO sms_log (telefono, mensaje, proveedor, estado, error_mensaje) VALUES ($1, $2, $3, $4, $5)',
      [telefono, mensaje, config.provider, result.success ? 'enviado' : 'error', result.error || null]
    )
  } catch (e) {
    console.error('Error guardando log SMS:', e)
  }

  return result
}

export async function enviarSmsConId(conexionId: number, telefono: string, mensaje: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const result = await pool.query('SELECT * FROM sms_conexiones WHERE id = $1 AND activa = true', [conexionId])
  if (result.rows.length === 0) {
    return { success: false, error: 'Conexion no encontrada o inactiva' }
  }
  const conexion = result.rows[0]
  const telefonoNormalizado = normalizarTelefonoMX(telefono)

  const sendResult = await enviarSmsConConexion(conexion, telefonoNormalizado, mensaje)

  try {
    await pool.query(
      'INSERT INTO sms_log (telefono, mensaje, proveedor, estado, error_mensaje) VALUES ($1, $2, $3, $4, $5)',
      [telefono, mensaje, `${conexion.proveedor} (${conexion.nombre})`, sendResult.success ? 'enviado' : 'error', sendResult.error || null]
    )
  } catch (e) {
    console.error('Error guardando log SMS:', e)
  }

  return sendResult
}

export function generarCodigoVerificacion(longitud: number = 6): string {
  return generarCodigo(longitud)
}

export { getSmsConfig, getConexionesActivas }
