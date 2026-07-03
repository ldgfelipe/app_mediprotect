import { Pool } from 'pg'
import * as cheerio from 'cheerio'
import { writeFileSync } from 'fs'

const pool = new Pool({
  connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

function transliterate(s) {
  const map = { 'á': 'a','é': 'e','í': 'i','ó': 'o','ú': 'u','ü': 'u','ñ': 'n','Á': 'a','É': 'e','Í': 'i','Ó': 'o','Ú': 'u','Ü': 'u','Ñ': 'n' }
  return s.replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g, c => map[c] || c).toLowerCase()
}

function generateProfileSlug(nombre, apellido) {
  const nombreParts = nombre.trim().split(/\s+/)
  const apellidoParts = apellido.trim().split(/\s+/)
  return [...nombreParts, apellidoParts[0]].map(p => transliterate(p)).join('-')
}

function getPrefix(titulo) {
  const t = titulo.toLowerCase()
  if (t.startsWith('dra') || t === 'lic.' || t === 'ln.' || t === 'enf.' || t === 'enf. esp.') return 'perfil-dra'
  return 'perfil-dr'
}

// Use exact working URLs from _url-results.json
const URL_MAP = {
  'erasmo-vega-osorio':   'https://www.mediprotect.com.mx/perfil-dr-erasmo-aaron-vega',
  'oscar-santos-garcia':  'https://www.mediprotect.com.mx/perfil-dr-oscar-de-los-santos',
  'pedro-diaz-garcia':    'https://www.mediprotect.com.mx/perfil-dr-pedro-diaz-garcia',
  'ricardo-alvarez-quiroz':'https://www.mediprotect.com.mx/perfil-dr-ricardo-alvarez-quiroz',
  'raquel-najem-gonzalez':'https://www.mediprotect.com.mx/perfil-dra-raquel-najem-gonzalez',
}

const doctorsToScrape = [
  { slug: 'erasmo-vega-osorio', nombre: 'Erasmo Aaron', apellido: 'Vega Osorio', titulo: 'Dr.' },
  { slug: 'oscar-santos-garcia', nombre: 'Oscar de los', apellido: 'Santos Garcia', titulo: 'Dr.' },
  { slug: 'pedro-diaz-garcia', nombre: 'Pedro', apellido: 'Diaz Garcia', titulo: 'Dr.' },
  { slug: 'ricardo-alvarez-quiroz', nombre: 'Ricardo', apellido: 'Alvarez Quiroz', titulo: 'Dr.' },
  { slug: 'raquel-najem-gonzalez', nombre: 'Raquel', apellido: 'Najem Gonzalez', titulo: 'Dra.' },
]

for (const d of doctorsToScrape) {
  d.url = URL_MAP[d.slug]
}

function stripExtraSpaces(s) {
  return s.replace(/\s+/g, ' ').trim()
}

async function scrapeProfile(url) {
  const resp = await fetch(url)
  const html = await resp.text()
  const $ = cheerio.load(html)

  const result = {
    foto_url: null,
    bio: null,
    formacion_academica: [],
    servicios: [],
    idiomas: [],
    horario_atencion: null,
    informacion_consulta: {},
  }

  // --- FOTO: find first doctor photo in /assets/uploads/ ---
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
      fotoSrc = `https://www.mediprotect.com.mx${fotoSrc.startsWith('/') ? '' : '/'}${fotoSrc}`
    }
    result.foto_url = fotoSrc
  }

  const sections = $('section.code-section')

  // --- Identify template by checking if hero section class has dark-background-color ---
  const firstSectionClass = sections.first().attr('class') || ''
  const isTemplateA = firstSectionClass.includes('dark-background-color')

  sections.each((i, section) => {
    const $sec = $(section)
    const html = $sec.html() || ''
    const text = $sec.text()

    // ---- BIO (both templates) ----
    // Template A: dark hero has a paragraph with bio text
    // Template B: light hero has paragraph with text-[var(--gray-text-color)]
    if (i === 0) {
      // In the hero section, find the paragraph that looks like a bio
      // It's a p tag that's NOT inside a div with .text-sm or similar small text
      const paragraphs = $sec.find('p')
      paragraphs.each((j, p) => {
        const $p = $(p)
        const pClass = $p.attr('class') || ''
        const pText = $p.text().trim()
        // Bio paragraph is typically longer, contains medical keywords
        if (pText.length > 50 && !pClass.includes('text-sm') && !pClass.includes('text-xs') && !pText.startsWith('©')) {
          // Check if it looks like a doctor bio
          const bioKeywords = ['Médico', 'médico', 'Cirujano', 'cirujano', 'Cardiólogo', 'especialista',
                               'egresado', 'egresada', 'diagnóstico', 'tratamiento', 'paciente']
          const hasKeyword = bioKeywords.some(k => pText.includes(k))
          if (hasKeyword) {
            result.bio = stripExtraSpaces(pText)
            return false // break out of each
          }
        }
      })
    }

    // ---- FORMATION: "Formación Académica" ----
    if (text.includes('Formación Académica')) {
      if (isTemplateA) {
        // Template A: find h3 elements and get their parent p sibling text
        $sec.find('h3').each((j, h3) => {
          const $h3 = $(h3)
          const name = stripExtraSpaces($h3.text())
          // Look for a p tag in the same parent div (the formation cards use h3 + p siblings)
          const parentDiv = $h3.parent()
          const pText = parentDiv.find('p').first().text().trim()
          if (name && !name.includes('Formación') && !name.includes('Especialidad')) {
            result.formacion_academica.push({ institucion: name, titulo: stripExtraSpaces(pText) })
          }
        })
      } else {
        // Template B: formation items use .flex.items-start.gap-4 with h4 + p
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

    // ---- SERVICES (both templates) ----
    // Template A: "Procedimientos que realiza" with cards .rounded-2xl.p-8
    // Template B: "Servicios" or "Procedimientos" with ul li
    if (text.includes('Procedimientos que realiza') || text.includes('Procedimientos')) {
      const cards = $sec.find('.rounded-2xl.p-8.shadow-md')
      if (cards.length > 0) {
        // Template A style cards
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
      // Only process if we didn't already get cards from this section (Template A vs B)
      if (result.servicios.length === 0 || $sec.find('ul li').length > result.servicios.length) {
        $sec.find('ul li').each((j, item) => {
          const $item = $(item)
          let name = $item.text().trim()
          // Remove icon text (fa-* or checkmark)
          name = name.replace(/^\s*[a-z-]+\s*/, '').trim()
          if (name && name.length > 2) {
            result.servicios.push({ nombre: stripExtraSpaces(name) })
          }
        })
      }
    }

    // ---- LANGUAGES: "Idiomas" ----
    if (text.includes('Idiomas') && ($sec.find('.flex.items-center.justify-between').length > 0 || $sec.find('.flex.items-center.justify-between').length > 0)) {
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

    // ---- CONSULTATION INFO ----
    if (text.includes('Dónde Atiendo') || text.includes('Agenda tu cita') || text.includes('Info de Consulta')) {
      // Extract center name
      const h3s = $sec.find('h3')
      h3s.each((j, h3) => {
        const ht = $(h3).text().trim()
        if (ht.includes('Mediwork') || ht.includes('Centro Médico') || ht.includes('Hospital')) {
          result.informacion_consulta.centro = stripExtraSpaces(ht)
        }
      })

      // Extract email
      const mailLinks = $sec.find('a[href^="mailto:"]')
      if (mailLinks.length && !result.informacion_consulta.email) {
        result.informacion_consulta.email = mailLinks.first().text().trim()
      }

      // Extract details from info cards (Template B has .rounded-2xl.p-8.shadow-lg)
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

        // Extract location in Template A style
        if (dt.includes('Ubicación') && !result.informacion_consulta.ubicacion) {
          $div.find('p.font-semibold').each((k, p) => {
            const pt = $(p).text().trim()
            if (pt.includes('Puebla')) {
              result.informacion_consulta.ubicacion = stripExtraSpaces(pt)
            }
          })
        }
      })

      // Template A: info items are .flex.items-center.gap-4
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

// Run scraping
const allResults = []
for (const d of doctorsToScrape) {
  console.log(`\n=== Fetching ${d.titulo} ${d.nombre} ${d.apellido} -> ${d.url}`)
  try {
    const data = await scrapeProfile(d.url)
    d.data = data
    allResults.push({ slug: d.slug, nombre: d.nombre, apellido: d.apellido, url: d.url, data })
    console.log(`  Bio: ${data.bio ? data.bio.substring(0, 80) + '...' : 'N/A'}`)
    console.log(`  Foto: ${data.foto_url ? data.foto_url.substring(0, 60) + '...' : 'N/A'}`)
    console.log(`  Formación: ${data.formacion_academica.length} entries`)
    console.log(`  Servicios: ${data.servicios.length} items`)
    console.log(`  Idiomas: ${data.idiomas.length} items`)
    console.log(`  Horario: ${data.horario_atencion ? 'Yes' : 'No'}`)
    console.log(`  Info Consulta: ${JSON.stringify(data.informacion_consulta)}`)
  } catch (err) {
    console.error(`  ERROR: ${err.message}`)
    d.data = null
    allResults.push({ slug: d.slug, nombre: d.nombre, apellido: d.apellido, url: d.url, error: err.message })
  }
}

// Save raw results
writeFileSync('_scraped-results.json', JSON.stringify(allResults, null, 2))
console.log('\nRaw results saved to _scraped-results.json')

// Update database
for (const d of doctorsToScrape) {
  if (!d.data) continue
  const { foto_url, bio, formacion_academica, servicios, idiomas, horario_atencion, informacion_consulta } = d.data

  try {
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
      foto_url,
      bio,
      JSON.stringify(formacion_academica),
      JSON.stringify(servicios),
      JSON.stringify(idiomas),
      horario_atencion,
      JSON.stringify(informacion_consulta),
      d.slug
    ])
    console.log(`  DB updated: ${d.slug}`)
  } catch (err) {
    console.error(`  DB ERROR for ${d.slug}: ${err.message}`)
  }
}

await pool.end()
console.log('\nDone!')
