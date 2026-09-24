export interface EvolutionCon {
  gatewayUrl: string
  instanceName: string
  apiKey?: string
}

function baseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

export async function evolutionCall<T = any>(cfg: EvolutionCon, path: string, opts: { method?: string; body?: any } = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (cfg.apiKey) headers['apikey'] = cfg.apiKey
  if (opts.body !== undefined) headers['content-type'] = 'application/json'
  let res: Response
  try {
    res = await fetch(`${baseUrl(cfg.gatewayUrl)}${path}`, {
      method: opts.method || 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(15000),
    })
  } catch (e: any) {
    const err = new Error(`Evolution inaccesible en ${cfg.gatewayUrl}: ${e.message}`)
    ;(err as any).statusCode = 502
    throw err
  }
  if (!res.ok) {
    let detalle = ''
    try { detalle = await res.text() } catch {}
    const err = new Error(`Evolution respondió ${res.status}: ${detalle.slice(0, 300)}`)
    ;(err as any).statusCode = res.status
    throw err
  }
  if (res.status === 204) return {} as T
  return await res.json()
}

export function normalizarQR(s: string): string {
  return String(s || '').replace(/^data:image\/(png|jpeg|webp|jpg);base64,/, '').replace(/\s+/g, '')
}

export async function getInstanceState(cfg: EvolutionCon): Promise<string> {
  try {
    const r = await evolutionCall<any>(cfg, `/instance/connectionState/${cfg.instanceName}`)
    return r?.instance?.state || 'close'
  } catch (e: any) {
    if (e?.statusCode === 404) return 'close'
    throw e
  }
}

export async function deleteInstance(cfg: EvolutionCon) {
  try {
    await evolutionCall(cfg, `/instance/delete/${cfg.instanceName}`, { method: 'DELETE' })
  } catch (e: any) {
    if (e?.statusCode !== 404 && e?.statusCode !== 400 && e?.statusCode !== 403) throw e
  }
}

function espera(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function connectInstance(cfg: EvolutionCon): Promise<{ state: string; base64?: string }> {
  const state = await getInstanceState(cfg)
  if (state === 'open') return { state }

  await deleteInstance(cfg)

  let base64 = ''
  let creado = false
  for (let i = 0; i < 6 && !creado; i++) {
    if (i > 0) await espera(1500)
    try {
      const r = await evolutionCall<any>(cfg, '/instance/create', {
        method: 'POST',
        body: { instanceName: cfg.instanceName, integration: 'WHATSAPP-BAILEYS', qrcode: true },
      })
      base64 = r?.instance?.qrcode?.base64 || r?.qrcode?.base64 || ''
      creado = true
    } catch (e: any) {
      if (e?.statusCode !== 403 && e?.statusCode !== 400) throw e
    }
  }

  return { state: 'connecting', base64 }
}

export async function logoutInstance(cfg: EvolutionCon) {
  await evolutionCall(cfg, `/instance/logout/${cfg.instanceName}`, { method: 'POST' })
}

export async function setWebhook(
  cfg: EvolutionCon,
  url: string,
  secret?: string,
  events: string[] = ['MESSAGES_UPSERT', 'QRCODE_UPDATED', 'CONNECTION_UPDATE']
) {
  const headers: Record<string, string> = {}
  if (secret) headers['x-mediprotect-apikey'] = secret
  await evolutionCall(cfg, `/webhook/set/${cfg.instanceName}`, {
    method: 'POST',
    body: { webhook: { url, enabled: true, events, byEvents: false, headers } },
  })
}