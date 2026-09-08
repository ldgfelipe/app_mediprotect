import nodemailer from 'nodemailer'
import { getPool } from './db.js'

let transporter: nodemailer.Transporter | null = null
let transporterKey = ''

export interface SmtpConfig {
  enabled: boolean
  host: string
  port: number
  user: string
  pass: string
  from: string
}

function smtpFallback(): SmtpConfig {
  return {
    enabled: true,
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER || 'b70b6d001@smtp-brevo.com',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'agente@mediprotect.com.mx',
  }
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
  try {
    const pool = getPool()
    const result = await pool.query(
      "SELECT clave, valor, tipo FROM configuracion_sistema WHERE categoria = 'smtp'"
    )
    if (result.rows.length === 0) return smtpFallback()

    const m: Record<string, string> = {}
    for (const row of result.rows) m[row.clave] = row.valor

    return {
      enabled: m.smtp_enabled !== 'false',
      host: m.smtp_host || smtpFallback().host,
      port: Number(m.smtp_port) || smtpFallback().port,
      user: m.smtp_user || smtpFallback().user,
      pass: m.smtp_pass || smtpFallback().pass,
      from: m.smtp_from || smtpFallback().from,
    }
  } catch {
    return smtpFallback()
  }
}

export async function getTransporter(): Promise<nodemailer.Transporter> {
  const config = await getSmtpConfig()
  const key = JSON.stringify([config.host, config.port, config.user, config.pass])

  if (transporter && transporterKey === key) return transporter

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
    tls: { rejectUnauthorized: false },
  })
  transporterKey = key

  return transporter
}

export async function enviarCorreo(to: string, subject: string, html: string): Promise<void> {
  const config = await getSmtpConfig()
  const transporter = await getTransporter()

  const info = await transporter.sendMail({
    from: config.from,
    to,
    subject,
    html,
  })

  console.log('Correo enviado:', info.messageId)
}

export async function probarSmtp(to: string): Promise<void> {
  const config = await getSmtpConfig()
  const transporter = await getTransporter()

  await transporter.verify()

  await transporter.sendMail({
    from: config.from,
    to,
    subject: 'MediProtect - Prueba SMTP',
    html: `<h2>¡Prueba exitosa!</h2>
           <p>Tu configuración de correo está funcionando correctamente.</p>
           <p><small>Si recibes este mensaje, la configuración SMTP (Brevo u otro proveedor) es correcta.</small></p>`,
  })
}