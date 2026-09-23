import { createHash, timingSafeEqual } from 'node:crypto'

function ipNormalizada(ip: string): string {
  if (!ip) return ''
  return ip.replace(/^::ffff:/, '')
}

function esLoopback(ip: string): boolean {
  const i = ipNormalizada(ip)
  return i === '127.0.0.1' || i === '::1'
}

function compararSegura(a: string, b: string): boolean {
  const ha = createHash('sha256').update(String(a)).digest()
  const hb = createHash('sha256').update(String(b)).digest()
  return timingSafeEqual(ha, hb)
}

function ipCliente(event: any): string {
  const remote = event.node?.req?.socket?.remoteAddress || ''
  const xff = getHeader(event, 'x-forwarded-for')
  if (xff && esLoopback(remote)) {
    const primerSalto = xff.split(',')[0].trim()
    if (primerSalto) return ipNormalizada(primerSalto)
  }
  return ipNormalizada(remote)
}

export function estaAutorizadoWebhook(event: any): boolean {
  const cfg = useRuntimeConfig()

  const secreto = cfg.whatsappWebhookApikey || ''
  if (secreto) {
    const recibido = getHeader(event, 'x-mediprotect-apikey') || ''
    if (!compararSegura(secreto, recibido)) return false
  }

  const permitidas = String(cfg.whatsappWebhookAllowedIps || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const ip = ipCliente(event)

  if (permitidas.length > 0) {
    return permitidas.some((p) => ipNormalizada(p) === ip)
  }

  return esLoopback(ip)
}