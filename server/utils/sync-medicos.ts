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
        const slug = href.replace('/perfil-dr-', '').replace('/perfil-dra-', '').replace(/\/$/, '')
        if (slug && !slugs.includes(slug)) slugs.push(slug)
      }
    })

    return slugs
  } catch (e) {
    console.error('[Sync Medicos] Error fetching directory:', e)
    return []
  }
}

async function scrapeProfile(url: string): Promise<any> {
  const resp = await fetch(url)
  const html = await resp.text()
  const $ = cheerio.load(html)

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
  $('img').each((i, img) => {
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

  sections.each((i, section) => {
    const $sec = $(section)
    const html = $sec.html() || ''
    const text = $sec.text()

    if (i === 0) {
      const paragraphs = $sec.find('p')
      paragraphs.each((j, p) => {
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
        $sec.find('h3').each((j, h3) => {
          const $h3 = $(h3)
          const name = stripExtraSpaces($h3.text())
          const parentDiv = $h3.parent()
          const pText = parentDiv.find('p').first().text().trim()
          if (name && !name.includes('Formación') && !name.includes('Especialidad')) {
            result.formacion_academica.push({ institucion: name, titulo: stripExtraSpaces(pText) })
          }
        })
      } else {
        $sec.find('.flex.items-start.gap-4').each((j, item) => {
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
        cards.each((j, card) => {
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
        $sec.find('ul li').each((j, item) => {
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
      $sec.find('.flex.items-center.justify-between').each((j, item) => {
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
      h3s.each((j, h3) => {
        const ht = $(h3).text().trim()
        if (ht.includes('Mediwork') || ht.includes('Centro Médico') || ht.includes('Hospital')) {
          result.informacion_consulta.centro = stripExtraSpaces(ht)
        }
      })

      const mailLinks = $sec.find('a[href^="mailto:"]')
      if (mailLinks.length && !result.informacion_consulta.email) {
        result.informacion_consulta.email = mailLinks.first().text().trim()
      }

      $sec.find('.rounded-2xl.p-8.shadow-lg, .rounded-2xl.p-8.shadow-md').each((j, div) => {
        const $div = $(div)
        const dt = $div.text()

        if (dt.includes('Dirección')) {
          $div.find('p.text-sm').each((k, p) => {
            const pt = $(p).text().trim()
            if (pt.includes('Blvd') || pt.includes('5 de Mayo') || pt.includes('C.P.') || pt.includes('Col.')) {
              result.informacion_consulta.direccion = stripExtraSpaces(pt)
            }
          })
        }

        if (dt.includes('Horario')) {
          const hours = []
          $div.find('p.font-bold, p.text-sm').each((k, p) => {
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
          $div.find('p.font-semibold').each((k, p) => {
            const pt = $(p).text().trim()
            if (pt.includes('Puebla')) {
              result.informacion_consulta.ubicacion = stripExtraSpaces(pt)
            }
          })
        }
      })

      $sec.find('.flex.items-center.gap-4').each((j, item) => {
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

export async function syncMedicosFromMediProtect(pool: any): Promise<{ success: number; errors: number; details: any[] }> {
  const slugs = await fetchAllDoctorSlugs()
  console.log(`[Sync Medicos] Found ${slugs.length} doctor slugs to sync`)

  let success = 0
  let errors = 0
  const details: any[] = []

  for (const slug of slugs) {
    try {
      const url = `${MEDIPROTECT_BASE}/perfil-dr-${slug}`
      const data = await scrapeProfile(url)

      await pool.query(`
        UPDATE medicos SET
          foto_url = COALESCE($1, foto_url),
          bio = COALESCE($2, bio),
          formacion_academica = $3::jsonb,
          servicios = $4::jsonb,
          idiomas = $5::jsonb,
          horario_atencion = $6,
          informacion_consulta = $7::jsonb
        WHERE slug = $8
      `, [
        data.foto_url,
        data.bio,
        JSON.stringify(data.formacion_academica),
        JSON.stringify(data.servicios),
        JSON.stringify(data.idiomas),
        data.horario_atencion,
        JSON.stringify(data.informacion_consulta),
        slug
      ])

      success++
      details.push({ slug, status: 'updated' })
      console.log(`[Sync Medicos] Updated: ${slug}`)
    } catch (err: any) {
      errors++
      details.push({ slug, status: 'error', error: err?.message || 'Unknown error' })
      console.error(`[Sync Medicos] Error syncing ${slug}:`, err?.message)
    }
  }

  return { success, errors, details }
}

export async function syncSingleMedico(pool: any, slug: string): Promise<any> {
  const url = `${MEDIPROTECT_BASE}/perfil-dr-${slug}`
  const data = await scrapeProfile(url)

  await pool.query(`
    UPDATE medicos SET
      foto_url = COALESCE($1, foto_url),
      bio = COALESCE($2, bio),
      formacion_academica = $3::jsonb,
      servicios = $4::jsonb,
      idiomas = $5::jsonb,
      horario_atencion = $6,
      informacion_consulta = $7::jsonb
    WHERE slug = $8
  `, [
    data.foto_url,
    data.bio,
    JSON.stringify(data.formacion_academica),
    JSON.stringify(data.servicios),
    JSON.stringify(data.idiomas),
    data.horario_atencion,
    JSON.stringify(data.informacion_consulta),
    slug
  ])

  return { slug, status: 'updated', data }
}