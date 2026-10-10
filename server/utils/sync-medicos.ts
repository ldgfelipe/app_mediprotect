import * as cheerio from 'cheerio'

const MEDIPROTECT_BASE = 'https://www.mediprotect.com.mx'

function transliterate(s: string) {
  const map: Record<string, string> = { 'á': 'a','é': 'e','í': 'i','ó': 'o','ú': 'u','ü': 'u','ñ': 'n','Á': 'a','É': 'e','Í': 'i','Ó': 'o','Ú': 'u','Ü': 'u','Ñ': 'n' }
  return s.replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g, c => map[c] || c).toLowerCase()
}

function generateProfileSlug(nombre: string, apellido: string) {
  const nombreParts = nombre.trim().split(/\s+/)
  const apellidoParts = apellido.trim().split(/\s+/)
  return [...nombreParts, apellidoParts[0]].map(p => transliterate(p)).join('-')
}

function getPrefix(titulo: string) {
  const t = titulo.toLowerCase()
  if (t.startsWith('dra') || t === 'lic.' || t === 'ln.' || t === 'enf.' || t === 'enf. esp.') return 'perfil-dra'
  return 'perfil-dr'
}

function stripExtraSpaces(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

async function fetchAllDoctorSlugs(): Promise<string[]> {
  try {
    const resp = await fetch(`${MEDIPROTECT_BASE}/directorio-medico`)
    const html = await resp.text()
    const $ = cheerio.load(html)
    const slugs: string[] = []

    $('a[href^="/perfil-"]').each((i, el) => {
      const href = $(el).attr('href')
      if (href) {
        // Soportar tanto perfil-dr- (hombres) como perfil-dra- (mujeres)
        const slug = href
          .replace('/perfil-dr-', '')
          .replace('/perfil-dra-', '')
          .replace(/\/$/, '')
        if (slug && !slugs.includes(slug)) slugs.push(slug)
      }
    })

    return slugs
  } catch (e) {
    console.error('[Sync Medicos] Error fetching directory:', e)
    return []
  }
}

export async function syncMedicosFromMediProtect(pool: any): Promise<{ success: number; errors: number; details: any[] }> {
  const slugs = await fetchAllDoctorSlugs()
  console.log(`[Sync Medicos] Found ${slugs.length} doctor slugs to sync`)

  let success = 0
  let errors = 0
  const details: any[] = []

  for (const slug of slugs) {
    try {
      // Primero intentamos con perfil-dr-, si falla 404 probamos perfil-dra-
      let url = `${MEDIPROTECT_BASE}/perfil-dr-${slug}`
      let resp = await fetch(url)
      if (resp.status === 404) {
        url = `${MEDIPROTECT_BASE}/perfil-dra-${slug}`
        resp = await fetch(url)
      }
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} for ${url}`)
      }
      const html = await resp.text()
      const $ = cheerio.load(html)
      const data = await scrapeProfileFromHtml($, url)

      // UPSERT: Insertar si no existe, actualizar si existe
      await pool.query(`
        INSERT INTO medicos (
          slug, foto_url, bio, formacion_academica, servicios, 
          idiomas, horario_atencion, informacion_consulta,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (slug) DO UPDATE SET
          foto_url = COALESCE(EXCLUDED.foto_url, medicos.foto_url),
          bio = COALESCE(EXCLUDED.bio, medicos.bio),
          formacion_academica = EXCLUDED.formacion_academica,
          servicios = EXCLUDED.servicios,
          idiomas = EXCLUDED.idiomas,
          horario_atencion = EXCLUDED.horario_atencion,
          informacion_consulta = EXCLUDED.informacion_consulta,
          updated_at = NOW()
        WHERE medicos.slug = $1
      `, [
        slug,
        data.foto_url,
        data.bio,
        JSON.stringify(data.formacion_academica),
        JSON.stringify(data.servicios),
        JSON.stringify(data.idiomas),
        data.horario_atencion,
        JSON.stringify(data.informacion_consulta)
      ])

      success++
      details.push({ slug, status: 'upserted' })
      console.log(`[Sync Medicos] Upserted: ${slug}`)
    } catch (err: any) {
      errors++
      details.push({ slug, status: 'error', error: err?.message || 'Unknown error' })
      console.error(`[Sync Medicos] Error syncing ${slug}:`, err?.message)
    }
  }

  return { success, errors, details }
}

// Nueva función para separar lógica de parsing del HTML ya cargado
async function scrapeProfileFromHtml($: any, url: string): Promise<any> {
  const result = {
    foto_url: null as string | null,
    bio: null as string | null,
    formacion_academica: [] as any[],
    servicios: [] as any[],
    idiomas: [] as any[],
    horario_atencion: null as string | null,
    informacion_consulta: {} as any,
  }

  let fotoSrc = null
  $('img').each((i: number, img: any) => {
    if (fotoSrc) return
    const $img = $(img)
    const src = $img.attr('src') || ''
    const alt = $img.attr('alt') || ''
    if (src.includes('/assets/uploads/') && !alt.includes('MediProtect') && alt.toLowerCase() !== 'logo') {
      fotoSrc = src
    }
  })
  if (fotoSrc) {
    if (!fotoSrc.startsWith('http')) {
      fotoSrc = `${MEDIPROTECT_BASE}${fotoSrc.startsWith('/') ? '' : '/'}${fotoSrc}`
    }
    result.foto_url = fotoSrc
  }

  const sections = $('section.code-section')
  const firstSectionClass = sections.first().attr('class') || ''
  const isTemplateA = firstSectionClass.includes('dark-background-color')

  sections.each((i: number, section: any) => {
    const $sec = $(section)
    const text = $sec.text()

    if (i === 0) {
      const paragraphs = $sec.find('p')
      paragraphs.each((j: number, p: any) => {
        const $p = $(p)
        const pClass = $p.attr('class') || ''
        const pText = $p.text().trim()
        if (pText.length > 50 && !pClass.includes('text-sm') && !pClass.includes('text-xs') && !pText.startsWith('©')) {
          const bioKeywords = ['Médico', 'médico', 'Cirujano', 'cirujano', 'Cardiólogo', 'especialista',
                               'egresado', 'egresada', 'diagnóstico', 'tratamiento', 'paciente']
          const hasKeyword = bioKeywords.some(k => pText.includes(k))
          if (hasKeyword) {
            result.bio = stripExtraSpaces(pText)
            return false
          }
        }
      })
    }

    if (text.includes('Formación Académica')) {
      if (isTemplateA) {
        $sec.find('h3').each((j: number, h3: any) => {
          const $h3 = $(h3)
          const name = stripExtraSpaces($h3.text())
          const parentDiv = $h3.parent()
          const pText = parentDiv.find('p').first().text().trim()
          if (name && !name.includes('Formación') && !name.includes('Especialidad')) {
            result.formacion_academica.push({ institucion: name, titulo: stripExtraSpaces(pText) })
          }
        })
      } else {
        $sec.find('.flex.items-start.gap-4').each((j: number, item: any) => {
          const $item = $(item)
          const h4 = $item.find('h4').text().trim()
          const ps = $item.find('p.text-sm')
          const inst = ps.first().text().trim()
          if (h4 && !h4.includes('Certificación') && !h4.includes('certificación') && !h4.includes('Certificado')) {
            result.formacion_academica.push({ titulo: stripExtraSpaces(h4), institucion: stripExtraSpaces(inst) })
          }
        })
      }
    }

    if (text.includes('Procedimientos que realiza') || text.includes('Procedimientos')) {
      const cards = $sec.find('.rounded-2xl.p-8.shadow-md')
      if (cards.length > 0) {
        cards.each((j: number, card: any) => {
          const $card = $(card)
          const h3 = $card.find('h3.text-lg').text().trim()
          const desc = $card.find('p.text-sm').text().trim()
          if (h3) {
            result.servicios.push({ nombre: stripExtraSpaces(h3), descripcion: stripExtraSpaces(desc) })
          }
        })
      }
    }
    if ((text.includes('Servicios') || text.includes('Procedimientos')) && $sec.find('ul').length > 0) {
      if (result.servicios.length === 0 || $sec.find('ul li').length > result.servicios.length) {
        $sec.find('ul li').each((j: number, item: any) => {
          const $item = $(item)
          let name = $item.text().trim()
          name = name.replace(/^\s*[a-z-]+\s*/, '').trim()
          if (name && name.length > 2) {
            result.servicios.push({ nombre: stripExtraSpaces(name) })
          }
        })
      }
    }

    if (text.includes('Idiomas') && $sec.find('.flex.items-center.justify-between').length > 0) {
      $sec.find('.flex.items-center.justify-between').each((j: number, item: any) => {
        const $item = $(item)
        const spans = $item.find('span')
        if (spans.length >= 2) {
          const lang = $(spans[0]).text().trim()
          const level = $(spans[1]).text().trim()
          if (lang && level) {
            result.idiomas.push({ idioma: stripExtraSpaces(lang), nivel: stripExtraSpaces(level) })
          }
        }
      })
    }

    if (text.includes('Dónde Atiendo') || text.includes('Agenda tu cita') || text.includes('Info de Consulta')) {
      const h3s = $sec.find('h3')
      h3s.each((j: number, h3: any) => {
        const ht = $(h3).text().trim()
        if (ht.includes('Mediwork') || ht.includes('Centro Médico') || ht.includes('Hospital')) {
          result.informacion_consulta.centro = stripExtraSpaces(ht)
        }
      })

      const mailLinks = $sec.find('a[href^="mailto:"]')
      if (mailLinks.length && !result.informacion_consulta.email) {
        result.informacion_consulta.email = mailLinks.first().text().trim()
      }

      $sec.find('.rounded-2xl.p-8.shadow-lg, .rounded-2xl.p-8.shadow-md').each((j: number, div: any) => {
        const $div = $(div)
        const dt = $div.text()

        if (dt.includes('Dirección')) {
          $div.find('p.text-sm').each((k: number, p: any) => {
            const pt = $(p).text().trim()
            if (pt.includes('Blvd') || pt.includes('5 de Mayo') || pt.includes('C.P.') || pt.includes('Col.')) {
              result.informacion_consulta.direccion = stripExtraSpaces(pt)
            }
          })
        }

        if (dt.includes('Horario')) {
          const hours = []
          $div.find('p.font-bold, p.text-sm').each((k: number, p: any) => {
            const t = $(p).text().trim()
            if ((t.includes('Lunes') || t.includes('Sáb') || t.includes('AM') || t.includes('PM')) && !t.includes('Horario')) {
              hours.push(t)
            }
          })
          if (hours.length > 0) {
            result.horario_atencion = hours.join('\n')
          }
        }

        if (dt.includes('Teléfono')) {
          const telA = $div.find('a[href^="tel:"]')
          if (telA.length) result.informacion_consulta.telefono = telA.text().trim()
        }

        if ((dt.includes('WhatsApp') || dt.includes('whatsapp')) && !result.informacion_consulta.whatsapp) {
          const waA = $div.find('a[href*="wa.me"]')
          if (waA.length) result.informacion_consulta.whatsapp = waA.text().trim()
        }

        if (dt.includes('Ubicación') && !result.informacion_consulta.ubicacion) {
          $div.find('p.font-semibold').each((k: number, p: any) => {
            const pt = $(p).text().trim()
            if (pt.includes('Puebla')) {
              result.informacion_consulta.ubicacion = stripExtraSpaces(pt)
            }
          })
        }
      })

      $sec.find('.flex.items-center.gap-4').each((j: number, item: any) => {
        const $item = $(item)
        const label = $item.find('p').first().text().trim()
        const value = $item.find('p').last().text().trim()
        if (label === 'Centro Médico' && !result.informacion_consulta.centro) {
          result.informacion_consulta.centro = stripExtraSpaces(value)
        } else if (label === 'Ubicación' && !result.informacion_consulta.ubicacion) {
          result.informacion_consulta.ubicacion = stripExtraSpaces(value)
        } else if ((label === 'Correo' || label === 'Email') && !result.informacion_consulta.email) {
          result.informacion_consulta.email = stripExtraSpaces(value)
        }
      })
    }
  })

  return result
}