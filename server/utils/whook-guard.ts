import { createHash, timingSafeEqual } from 'node:crypto'
import { resolve4 } from 'node:dns/promises'

const dnsCache = new Map<string, string>()

async function dnsIp(host: string): Promise<string> {
  const h = String(host).toLowerCase().replace(/:\d+$/, '')
  if (!h) return ''
  if (dnsCache.has(h)) return dnsCache.get(h)!
  try {
    const ips = await resolve4(h)
    const ip = ips[0] || ''
    if (h && ip) {
      dnsCache.set(h, ip)
      setTimeout(() => dnsCache.delete(h), 10 * 60 * 1000).unref()
    }
    return ip
  } catch {
    return ''
  }
}

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

export async function estaAutorizadoWebhook(event: any): Promise<boolean> {
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

  if (esLoopback(ip)) return true

  const host = getHeader(event, 'host') || ''
  if (host) {
    const dns = await dnsIp(host)
    if (dns && ip === dns) return true
  }

  return false
}