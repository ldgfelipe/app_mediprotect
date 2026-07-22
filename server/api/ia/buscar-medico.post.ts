import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  // Verificar auth
  const token = getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'default_secret') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const body = await readBody(event)
  const { texto } = body

  if (!texto || texto.trim().length < 20) {
    throw createError({ statusCode: 400, message: 'La información del médico es requerida (mínimo 20 caracteres)' })
  }

  const pool = getPool()

  // Obtener configuración de IA
  const configResult = await pool.query(
    `SELECT clave, valor FROM configuracion_sistema
     WHERE clave IN (
       'ai_openai_key', 'ai_openai_model', 'ai_openai_enabled',
       'ai_claude_key', 'ai_claude_model', 'ai_claude_enabled',
       'ai_gemini_key', 'ai_gemini_model', 'ai_gemini_enabled',
       'ai_cloudflare_key', 'ai_cloudflare_account_id', 'ai_cloudflare_model', 'ai_cloudflare_enabled',
       'ai_provider_preferido'
     )`
  )

  const config: Record<string, string> = {}
  for (const row of configResult.rows) {
    config[row.clave] = row.valor
  }

  // Determinar proveedor a usar
  const providers = [
    { name: 'openai', enabled: config.ai_openai_enabled === 'true', key: config.ai_openai_key },
    { name: 'claude', enabled: config.ai_claude_enabled === 'true', key: config.ai_claude_key },
    { name: 'gemini', enabled: config.ai_gemini_enabled === 'true', key: config.ai_gemini_key },
    { name: 'cloudflare', enabled: config.ai_cloudflare_enabled === 'true', key: config.ai_cloudflare_key },
  ]

  const preferred = config.ai_provider_preferido || 'openai'
  const sorted = providers.sort((a, b) => {
    if (a.name === preferred && a.enabled) return -1
    if (b.name === preferred && b.enabled) return 1
    if (a.enabled && !b.enabled) return -1
    if (!a.enabled && b.enabled) return 1
    return 0
  })

  const provider = sorted.find(p => p.enabled && p.key)
  if (!provider) {
    throw createError({
      statusCode: 400,
      message: 'No hay proveedor de IA configurado. Ve a Configuración > IA para configurar uno.'
    })
  }

  // Prompt para procesar información del médico desde Google Form
  const prompt = `Eres un asistente que procesa información de médicos proveniente de formularios de Google Forms.

El usuario te va a pegar la respuesta de un Google Form con información de un médico. Tu tarea es extraer y organizar toda la información en un perfil estructurado.

IMPORTANTE: Extrae la información TAL COMO VIENE en el texto. No inventes datos que no estén presentes.

Devuelve un JSON con estos campos:

{
  "nombre": "Nombre del médico (sin título como Dr.)",
  "apellido": "Apellido(s)",
  "cedula_profesional": "Número de cédula",
  "titulo": "Título profesional (ej: Médico Cirujano, Doctor en Medicina)",
  "especialidad": "Especialidad médica principal",
  "subespecialidad": "Subespecialidad si aplica",
  "universidad": "Universidad donde estudió",
  "ciudad": "Ciudad de práctica",
  "hospital": "Hospital o clínica donde trabaja",
  "clinica": "Nombre de clínica propia si tiene",
  "consultorio": "Dirección del consultorio",
  "telefono": "Teléfono de contacto",
  "email": "Correo electrónico",
  "web": "Sitio web personal si tiene",
  "linkedin": "Perfil de LinkedIn si tiene",
  "bio": "Breve biografía profesional (2-3 párrafos bien escritos, estilo perfil profesional para web)",
  "servicios": ["Lista de servicios que ofrece"],
  "idiomas": ["Idiomas que habla"],
  "formacion_academica": [{"titulo": "...", "institucion": "...", "anio": "..."}],
  "certificaciones": ["Certificaciones, membresías y títulos adicionales"],
  "horario_atencion": "Horario general de atención",
  "experiencia_anos": "Años de experiencia si se menciona",
  "enfermedades_tratadas": ["Enfermedades o condiciones que trata"],
  "procedimientos": ["Procedimientos especiales que realiza"],
  "fotos_urls": ["URLs de fotos si se mencionan"]
}

Información del médico (respuesta del Google Form):
---
${texto}
---

Si un campo no se encuentra en el texto, déjalo como null o string vacío. Para la biografía, reforma el texto de forma profesional y atractiva para un perfil de página web.
Para servicios y enfermedades, extrae y organiza la información de forma clara.

Responde SOLO con el JSON, sin explicaciones adicionales.`

  try {
    let result: string

    if (provider.name === 'openai') {
      result = await callOpenAI(config.ai_openai_key, config.ai_openai_model || 'gpt-4o', prompt)
    } else if (provider.name === 'claude') {
      result = await callClaude(config.ai_claude_key, config.ai_claude_model || 'claude-sonnet-4-20250514', prompt)
    } else if (provider.name === 'gemini') {
      result = await callGemini(config.ai_gemini_key, config.ai_gemini_model || 'gemini-2.0-flash', prompt)
    } else if (provider.name === 'cloudflare') {
      result = await callCloudflare(config.ai_cloudflare_key, config.ai_cloudflare_account_id, config.ai_cloudflare_model, prompt)
    } else {
      throw createError({ statusCode: 400, message: 'Proveedor no soportado' })
    }

    // Parsear respuesta JSON
    let perfil: any
    try {
      // Limpiar respuesta si viene con markdown
      const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      perfil = JSON.parse(cleaned)
    } catch {
      throw createError({ statusCode: 500, message: 'Error al parsear respuesta de IA', detalles: result })
    }

    return {
      success: true,
      proveedor: provider.name,
      perfil
    }

  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      message: `Error con proveedor ${provider.name}: ${err.message}`
    })
  }
})

// ============= Provedores IA =============

async function callOpenAI(apiKey: string, model: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function callClaude(apiKey: string, model: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.content[0].text
}

async function callGemini(apiKey: string, model: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4000 }
      })
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

async function callCloudflare(apiKey: string, accountId: string, model: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.3
      })
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.errors?.[0]?.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.result.response
}
