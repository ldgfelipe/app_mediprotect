import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

export function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter

  const smtpUser = process.env.SMTP_USER || 'b70b6d001@smtp-brevo.com'
  const smtpPass = process.env.SMTP_PASS || ''
  const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com'
  const smtpPort = Number(process.env.SMTP_PORT) || 465

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false },
  })

  return transporter
}

export async function enviarCorreo(to: string, subject: string, html: string): Promise<void> {
  const transporter = getTransporter()
  const from = process.env.SMTP_FROM || 'agente@mediprotect.com.mx'

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  })

  console.log('Correo enviado:', info.messageId)
}