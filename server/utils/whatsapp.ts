export interface WhatsAppConfig {
  gatewayUrl: string
  instanceName: string
  apiKey: string
}

function normalizarTelefono(telefono: string): string {
  return (telefono || '').replace(/[^0-9]/g, '')
}

function resolverUrl(config: WhatsAppConfig, recurso: string): string {
  const base = (config.gatewayUrl || '').replace(/\/+$/, '')
  const instancia = encodeURIComponent(config.instanceName || '')
  return `${base}/${recurso}/${instancia}`
}

function cabeceras(config: WhatsAppConfig) {
  return {
    'Content-Type': 'application/json',
    'apikey': config.apiKey || ''
  }
}

async function parsearRespuesta(res: Response, url: string): Promise<{ status: number; ok: boolean; data: any; url: string }> {
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(`Evolution API error ${res.status}: ${JSON.stringify(data)}`)
  }
  return { status: res.status, ok: res.ok, data, url }
}

export async function enviarMensaje(config: WhatsAppConfig, telefono: string, texto: string) {
  const url = resolverUrl(config, 'message/sendText')
  const res = await fetch(url, {
    method: 'POST',
    headers: cabeceras(config),
    body: JSON.stringify({
      number: normalizarTelefono(telefono),
      text: texto
    })
  })
  return parsearRespuesta(res, url)
}

export async function enviarLista(
  config: WhatsAppConfig,
  telefono: string,
  texto: string,
  opciones: { id: string; titulo: string; descripcion?: string }[],
  tituloSeccion = 'Opciones'
) {
  const sections = [{
    title: tituloSeccion,
    rows: opciones.map(o => ({
      title: o.titulo,
      description: o.descripcion || '',
      rowId: o.id
    }))
  }]

  const url = resolverUrl(config, 'message/sendList')
  const res = await fetch(url, {
    method: 'POST',
    headers: cabeceras(config),
    body: JSON.stringify({
      number: normalizarTelefono(telefono),
      title: 'MediProtect',
      description: texto,
      buttonText: 'Seleccionar',
      sections
    })
  })
  return parsearRespuesta(res, url)
}

export async function enviarBotones(
  config: WhatsAppConfig,
  telefono: string,
  texto: string,
  botones: { id: string; titulo: string }[]
) {
  const url = resolverUrl(config, 'message/sendButtons')
  const res = await fetch(url, {
    method: 'POST',
    headers: cabeceras(config),
    body: JSON.stringify({
      number: normalizarTelefono(telefono),
      title: 'MediProtect',
      description: texto,
      footer: 'MediProtect',
      buttons: botones.map(b => ({
        type: 'reply',
        title: b.titulo,
        id: b.id
      }))
    })
  })
  return parsearRespuesta(res, url)
}