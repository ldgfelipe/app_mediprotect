import { Pool } from 'pg'

let transporter: any = null

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
})

interface SmsConfig {
  provider: string
  account_sid: string
  auth_token: string
  from_number: string
  modo: string
}

async function getSmsConfig(): Promise<SmsConfig> {
  const result = await pool.query(
    "SELECT clave, valor FROM configuracion_sistema WHERE categoria = 'sms' AND clave IN ('sms_provider', 'sms_twilio_account_sid', 'sms_twilio_auth_token', 'sms_twilio_from_number', 'sms_modo')"
  )
  const configMap: Record<string, string> = {}
  for (const row of result.rows) {
    configMap[row.clave] = row.valor
  }
  return {
    provider: configMap.sms_provider || 'twilio',
    account_sid: configMap.sms_twilio_account_sid || '',
    auth_token: configMap.sms_twilio_auth_token || '',
    from_number: configMap.sms_twilio_from_number || '',
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
    return { success: false, error: 'Twilio no esta configurado. Configura Account SID, Auth Token y numero en Administrador > Configuracion.' }
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

export async function enviarSms(telefono: string, mensaje: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const config = await getSmsConfig()
  const telefonoNormalizado = normalizarTelefonoMX(telefono)

  let result: { success: boolean; sid?: string; error?: string }

  switch (config.provider) {
    case 'twilio':
      result = await enviarSmsTwilio(config, telefonoNormalizado, mensaje)
      break
    default:
      result = { success: false, error: `Proveedor SMS '${config.provider}' no soportado` }
  }

  // Log the SMS
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

export function generarCodigoVerificacion(longitud: number = 6): string {
  return generarCodigo(longitud)
}

export { getSmsConfig }
