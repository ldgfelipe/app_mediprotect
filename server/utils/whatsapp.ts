interface WhatsAppConfig {
  token: string
  phoneNumberId: string
}

export async function enviarMensaje(config: WhatsAppConfig, telefono: string, texto: string) {
  const url = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: telefono,
      type: 'text',
      text: { preview_url: false, body: texto }
    })
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`WhatsApp API error ${res.status}: ${error}`)
  }

  return await res.json()
}

export async function enviarLista(
  config: WhatsAppConfig,
  telefono: string,
  texto: string,
  opciones: { id: string; titulo: string; descripcion?: string }[],
  tituloSeccion = 'Opciones'
) {
  const url = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`

  const rows = opciones.map(o => ({
    id: o.id,
    title: o.titulo,
    ...(o.descripcion ? { description: o.descripcion } : {})
  }))

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: telefono,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: { type: 'text', text: 'MediProtect' },
        body: { text: texto },
        action: {
          button: 'Seleccionar',
          sections: [{
            title: tituloSeccion,
            rows
          }]
        }
      }
    })
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`WhatsApp API error ${res.status}: ${error}`)
  }

  return await res.json()
}

export async function enviarBotones(
  config: WhatsAppConfig,
  telefono: string,
  texto: string,
  botones: { id: string; titulo: string }[]
) {
  const url = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: telefono,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: texto },
        action: {
          buttons: botones.map(b => ({
            type: 'reply',
            reply: { id: b.id, title: b.titulo }
          }))
        }
      }
    })
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`WhatsApp API error ${res.status}: ${error}`)
  }

  return await res.json()
}

export async function enviarTemplate(
  config: WhatsAppConfig,
  telefono: string,
  templateName: string,
  language: string,
  parameters: string[]
) {
  const url = `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`

  const components: any[] = []
  if (parameters.length > 0) {
    components.push({
      type: 'body',
      parameters: parameters.map(p => ({ type: 'text', text: p }))
    })
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: telefono,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components
      }
    })
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`WhatsApp API error ${res.status}: ${error}`)
  }

  return await res.json()
}
