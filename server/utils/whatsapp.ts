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

export async function enviarOpcionesTexto(
  config: WhatsAppConfig,
  telefono: string,
  texto: string,
  opciones: { id: string; titulo: string; descripcion?: string }[],
  tituloSeccion = 'Opciones'
) {
  const lineas = opciones
    .filter(o => o && (o.titulo || o.descripcion))
    .map((o, i) => `${i + 1}. ${o.titulo || o.descripcion}`)
    .join('\n')
  const cuerpo = `${texto}\n\n${lineas}\n\n_Responde solo con el número de la opción (ej. 1)._`
  return enviarMensaje(config, telefono, cuerpo)
}

// WhatsApp bloqueó los mensajes interactivos (sendList/sendButtons) en esta
// cuenta (respuesta 405 de Baileys). Se envían opciones como texto numerado y
// la respuesta del paciente se resuelve por índice (whatsapp-pending-appointments).
export async function enviarLista(
  config: WhatsAppConfig,
  telefono: string,
  texto: string,
  opciones: { id: string; titulo: string; descripcion?: string }[],
  tituloSeccion = 'Opciones'
) {
  return enviarOpcionesTexto(config, telefono, texto, opciones, tituloSeccion)
}

export async function enviarBotones(
  config: WhatsAppConfig,
  telefono: string,
  texto: string,
  botones: { id: string; titulo: string }[]
) {
  return enviarOpcionesTexto(config, telefono, texto, botones, 'Opciones')
}