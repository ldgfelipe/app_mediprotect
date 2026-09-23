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

export async function getInstanceState(cfg: EvolutionCon): Promise<string> {
  try {
    const r = await evolutionCall<any>(cfg, `/instance/connectionState/${cfg.instanceName}`)
    return r?.instance?.state || 'close'
  } catch (e: any) {
    if (e?.statusCode === 404) return 'close'
    throw e
  }
}

async function createInstance(cfg: EvolutionCon) {
  return evolutionCall(cfg, '/instance/create', {
    method: 'POST',
    body: { instanceName: cfg.instanceName, integration: 'WHATSAPP-BAILEYS', qrcode: true },
  })
}

export async function connectInstance(cfg: EvolutionCon): Promise<{ state: string; base64?: string }> {
  try {
    const r = await evolutionCall<any>(cfg, `/instance/connect/${cfg.instanceName}`, { method: 'POST' })
    const q = r?.qrcode || r?.data?.qrcode
    if (q?.base64) return { state: 'close', base64: q.base64 }
    if (r?.base64) return { state: 'close', base64: r.base64 }
    if (r?.instance?.state) return { state: r.instance.state }
    return { state: r?.instance?.state || 'close' }
  } catch (e: any) {
    if (e?.statusCode === 404) {
      await createInstance(cfg)
      return connectInstance(cfg)
    }
    throw e
  }
}

export async function logoutInstance(cfg: EvolutionCon) {
  await evolutionCall(cfg, `/instance/logout/${cfg.instanceName}`, { method: 'POST' })
}

export async function setWebhook(cfg: EvolutionCon, url: string, secret?: string) {
  const headers: Record<string, string> = {}
  if (secret) headers['x-mediprotect-apikey'] = secret
  await evolutionCall(cfg, `/webhook/set/${cfg.instanceName}`, {
    method: 'POST',
    body: { url, enabled: true, events: ['messages.upsert'], webhookByEvents: false, headers },
  })
}