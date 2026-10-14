/**
 * Resuelve la URL pública del perfil de un médico en mediprotect.com.mx.
 *
 * El botón "Ver" necesitaba abrir un perfil que exista realmente. El sitio
 * público usa slugs tipo `perfil-dr-{nombre}-{primer-apellido}`, mientras que
 * la app genera slugs `{nombre}-{apellidos}`. Aquí probamos los candidatos
 * posibles (y el `perfil_url_path`/`perfil_url` guardados) y devolvemos el
 * primero que responde correctamente. Si ninguno existe, devolvemos null para
 * que la interfaz muestre el detalle local en vez de una página 404.
 */

const BASE = 'https://www.mediprotect.com.mx'

const ACENTOS: Record<string, string> = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n',
  'Á': 'a', 'É': 'e', 'Í': 'i', 'Ó': 'o', 'Ú': 'u', 'Ü': 'u', 'Ñ': 'n',
}

function translit(s: string): string {
  return s.replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g, c => ACENTOS[c] || c).toLowerCase()
}

/** Slug del sitio público: nombre(s) + primer apellido. */
function landingSlug(nombre: string, apellido: string): string {
  const nParts = (nombre || '').trim().split(/\s+/).filter(Boolean)
  const aParts = (apellido || '').trim().split(/\s+/).filter(Boolean)
  if (!nParts.length) return ''
  const parts = aParts.length ? [...nParts, aParts[0]] : nParts
  return parts.map(translit).join('-')
}

function prefijos(titulo: string): string[] {
  const t = (titulo || '').toLowerCase()
  if (t.startsWith('dra') || t === 'lic.' || t === 'ln.' || t === 'enf.' || t === 'enf. esp.') {
    return ['perfil-dra', 'perfil-dr']
  }
  return ['perfil-dr', 'perfil-dra']
}

async function existe(url: string): Promise<boolean> {
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 4000)
  try {
    let resp = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal })
    if (resp.status === 405 || resp.status === 501) {
      resp = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal })
    }
    return resp.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

export default defineEventHandler(async (event) => {
  verifyAdminOrAsistenteToken(event)
  const pool = await useDbPool(event)
  const body = await readBody(event)
  const id = body?.id
  if (!id) throw createError({ statusCode: 400, message: 'ID del médico requerido' })

  const res = await pool.query(
    `SELECT id, nombre, apellido, apellido_paterno, apellido_materno, titulo, slug, perfil_url, perfil_url_path
     FROM medicos WHERE id = $1 LIMIT 1`,
    [id]
  )
  if (!res.rows.length) throw createError({ statusCode: 404, message: 'Médico no encontrado' })
  const m = res.rows[0]

  // 1) URL guardada explícitamente
  const guardada: string[] = []
  if (m.perfil_url) {
    guardada.push(String(m.perfil_url).startsWith('http') ? m.perfil_url : `${BASE}/${String(m.perfil_url).replace(/^\//, '')}`)
  }
  if (m.perfil_url_path) {
    guardada.push(`${BASE}/${String(m.perfil_url_path).replace(/^\//, '')}`)
  }

  const pref = prefijos(m.titulo)
  const apellidoCompleto = m.apellido || [m.apellido_paterno, m.apellido_materno].filter(Boolean).join(' ')
  const slugs = [m.slug, landingSlug(m.nombre, apellidoCompleto)].filter(Boolean) as string[]

  const generadas: string[] = []
  for (const s of slugs) {
    for (const p of pref) generadas.push(`${BASE}/${p}-${s}`)
  }

  const candidatos = [...new Set([...guardada, ...generadas])]

  // Probar todos en paralelo y elegir el primero (en orden de prioridad) que responda
  const resultados = await Promise.all(candidatos.map(async url => ({ url, ok: await existe(url) })))
  const encontrado = resultados.find(r => r.ok)

  if (encontrado) {
    // Guardar la ruta para que las siguientes aperturas sean instantáneas
    try {
      const path = encontrado.url.replace(BASE, '')
      await pool.query('UPDATE medicos SET perfil_url_path = $2 WHERE id = $1', [id, path])
    } catch (e: any) {
      console.error('[perfil-url] no se pudo cachear:', e?.message)
    }
    return { url: encontrado.url, candidatos }
  }

  return { url: null, candidatos }
})
