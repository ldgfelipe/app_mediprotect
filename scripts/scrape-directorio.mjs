import { Pool } from 'pg'

const BASE_URL = 'https://www.mediprotect.com.mx'

const CATEGORIES = [
  { slug: 'alergia-e-inmunologia', db_name: 'Alergia e Inmunología', color: 'primary' },
  { slug: 'acupuntura', db_name: 'Acupuntura', color: 'green' },
  { slug: 'bariatria', db_name: 'Bariatría', color: 'accent' },
  { slug: 'cardiologia', db_name: 'Cardiología', color: 'red' },
  { slug: 'cirugia-general', db_name: 'Cirugía General', color: 'accent2' },
  { slug: 'cirugia-plastica', db_name: 'Cirugía Plástica', color: 'pink' },
  { slug: 'coaching', db_name: 'Coaching', color: 'purple' },
  { slug: 'cirugia-pediatrica', db_name: 'Cirugía Pediátrica', color: 'orange' },
  { slug: 'curacion-de-heridas', db_name: 'Curación de Heridas', color: 'teal' },
  { slug: 'dermatologia', db_name: 'Dermatología', color: 'amber' },
  { slug: 'ecografia-ultrasonido', db_name: 'Ecografía / Ultrasonido', color: 'sky' },
  { slug: 'enfermeria-obstetrica', db_name: 'Enfermería Obstétrica', color: 'rose' },
  { slug: 'fisioterapia', db_name: 'Fisioterapia', color: 'cyan' },
  { slug: 'geriatria', db_name: 'Geriatría', color: 'amber' },
  { slug: 'ginecologia', db_name: 'Ginecología', color: 'fuchsia' },
  { slug: 'medicina-familiar', db_name: 'Medicina Familiar', color: 'emerald' },
  { slug: 'medicina-general', db_name: 'Medicina General', color: 'blue' },
  { slug: 'medicina-estetica', db_name: 'Medicina Estética', color: 'rose' },
  { slug: 'medicina-interna', db_name: 'Medicina Interna', color: 'indigo' },
  { slug: 'medicina-preventiva', db_name: 'Medicina Preventiva', color: 'green' },
  { slug: 'medicina-rehabilitacion', db_name: 'Medicina de Rehabilitación', color: 'lime' },
  { slug: 'nefrologia', db_name: 'Nefrología', color: 'sky' },
  { slug: 'neumologia', db_name: 'Neumología', color: 'slate' },
  { slug: 'neuropsicologia', db_name: 'Neuropsicología', color: 'violet' },
  { slug: 'nutricion', db_name: 'Nutrición', color: 'yellow' },
  { slug: 'odontologia', db_name: 'Odontología', color: 'teal' },
  { slug: 'oncologia', db_name: 'Oncología', color: 'red-600' },
  { slug: 'pediatria', db_name: 'Pediatría', color: 'amber-600' },
  { slug: 'psicologia', db_name: 'Psicología', color: 'cyan-600' },
  { slug: 'psiquiatria', db_name: 'Psiquiatría', color: 'indigo-600' },
  { slug: 'reumatologia', db_name: 'Reumatología', color: 'lime-600' },
  { slug: 'salud-auditiva', db_name: 'Salud Auditiva', color: 'green-600' },
  { slug: 'medicina-del-trabajo', db_name: 'Medicina del Trabajo', color: 'orange-600' },
  { slug: 'traumatologia-y-ortopedia', db_name: 'Traumatologia y Ortopedia', color: 'fuchsia-600' },
  { slug: 'terapia-de-infusion-intravenosa', db_name: 'Terapia de Infusion Intravenosa', color: 'purple-600' },
]

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres'
})

function normalizeStr(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function extractText(h) {
  return h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseDoctorsFromHtml(html) {
  const doctors = []
  const h3All = html.match(/<h3[^>]*>\s*(Dr[a]?\.[\s\S]*?)<\/h3>/gi) || []

  for (const m of h3All) {
    const nameRaw = m.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
    if (!nameRaw) continue
    const name = nameRaw[1].replace(/\s+/g, ' ').trim()
    if (!name.match(/^Dr[a]?\.\s/i)) continue

    const startIdx = html.indexOf(m)
    const nextH3 = html.indexOf('<h3', startIdx + m.length)
    const end = nextH3 !== -1 ? nextH3 : Math.min(startIdx + 5000, html.length)
    const section = html.substring(startIdx, end)

    const pTags = section.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []
    let titulo = null, cedula = null, location = null, clinica = null

    for (const p of pTags) {
      const pText = extractText(p)
      if (p.includes('fa-graduation-cap') || pText.match(/Céd(?:ula|\.\s*Esp)/i)) {
        const cedMatch = pText.match(/Céd(?:ula|\.\s*Esp):\s*(.+)/i)
        if (cedMatch) cedula = cedMatch[1].trim()
      }
      if (p.includes('fa-location-dot')) {
        const locMatch = pText.match(/(.+,\s*[A-ZÁ-Ú][a-záéíóú]+(?:\.\s*[A-ZÁ-Ú]?)?)/)
        if (locMatch) location = locMatch[1].trim()
      }
      if (p.includes('fa-building')) {
        const cliText = pText.trim()
        if (cliText) clinica = cliText
      }
    }

    const titleP = section.match(/<p[^>]*class="[^"]*primary-color[^"]*font-medium[^"]*"[^>]*>([\s\S]*?)<\/p>/)
    if (titleP) titulo = extractText(titleP[1]).trim()

    const perfilMatch = section.match(/href="([^"]*perfil[^"]*)"/i)
    let perfilUrl = perfilMatch ? perfilMatch[1] : null
    if (perfilUrl && !perfilUrl.startsWith('http')) perfilUrl = BASE_URL + perfilUrl
    if (perfilUrl && perfilUrl.endsWith('#')) perfilUrl = null

    const cityParts = location ? location.match(/(.+),\s*(.+)/) : null
    const nameParts = name.replace(/^Dra?\.\s*/i, '').trim().split(/\s+/)
    const half = Math.ceil(nameParts.length / 2)

    doctors.push({
      nombre_completo: name,
      nombre: nameParts.slice(0, half).join(' '),
      apellido: nameParts.slice(half).join(' '),
      titulo: name.match(/^Dra?\./i) ? name.match(/^(Dra?\.)\s*/i)[1] : '',
      titulo_especialidad: titulo,
      cedula,
      consultorio_ciudad: cityParts ? cityParts[1].trim() : null,
      consultorio_estado: cityParts ? cityParts[2].replace(/\.$/, '').trim() : null,
      consultorio_direccion: clinica,
      perfil_url: perfilUrl,
    })
  }
  return doctors
}

async function fetchCategoryPage(slug) {
  const url = `${BASE_URL}/directorio-medico-${slug}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MediProtect-Sync/1.0)' }
  })
  if (!res.ok) return null
  return await res.text()
}

async function main() {
  console.log('=== RASTREO DIRECTORIO MÉDICO MEDIPROTECT ===')
  console.log(`Categorías: ${CATEGORIES.length}\n`)

  const allDoctors = []
  const errors = []

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i]
    process.stdout.write(`[${i + 1}/${CATEGORIES.length}] ${cat.db_name}... `)
    try {
      const html = await fetchCategoryPage(cat.slug)
      if (!html) { console.log('FETCH ERROR'); errors.push(cat.slug); continue }
      const doctors = parseDoctorsFromHtml(html)
      console.log(`${doctors.length} doctores`)
      for (const d of doctors) {
        allDoctors.push({ ...d, categoria_slug: cat.slug, categoria_db: cat.db_name })
      }
      await new Promise(r => setTimeout(r, 300))
    } catch (e) {
      console.log(`ERROR: ${e.message}`)
      errors.push(cat.slug)
    }
  }

  console.log(`\nTotal web: ${allDoctors.length}\n`)

  console.log('=== SINCRONIZANDO CON DB ===\n')

  // Sync category colors
  console.log('--- Colores de categorías ---')
  for (const cat of CATEGORIES) {
    const res = await pool.query('UPDATE especialidades SET color = $1 WHERE slug = $2', [cat.color, cat.slug])
    if (res.rowCount > 0) console.log(`  ~ ${cat.db_name}: color=${cat.color}`)
  }

  const espRes = await pool.query('SELECT id, nombre FROM especialidades')
  const espMap = {}
  for (const e of espRes.rows) espMap[normalizeStr(e.nombre)] = e.id

  const existRes = await pool.query('SELECT id, nombre, apellido, cedula_profesional, consultorio_direccion, subespecialidad, consultorio_ciudad FROM medicos WHERE activo = true')
  const existentes = {}
  for (const e of existRes.rows) {
    const key = e.cedula_profesional
      ? normalizeStr(e.cedula_profesional)
      : normalizeStr(e.nombre + ' ' + e.apellido)
    existentes[key] = e
  }

  let insertados = 0, actualizados = 0, sinCambio = 0, sinEsp = 0, errs = 0

  for (const doc of allDoctors) {
    const espId = espMap[normalizeStr(doc.categoria_db)]
    if (!espId) { sinEsp++; continue }

    const lookupKey = doc.cedula
      ? normalizeStr(doc.cedula)
      : normalizeStr(doc.nombre + ' ' + doc.apellido)

    const existente = existentes[lookupKey]

    if (!existente) {
      try {
        await pool.query(
          `INSERT INTO medicos (nombre, apellido, titulo, cedula_profesional, consultorio_ciudad, consultorio_estado, consultorio_direccion, id_especialidad, activo, subespecialidad, email, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11)`,
          [doc.nombre, doc.apellido, doc.titulo, doc.cedula, doc.consultorio_ciudad, doc.consultorio_estado, doc.consultorio_direccion, espId, doc.titulo_especialidad, null, null]
        )
        console.log(`  + ${doc.nombre_completo} → ${doc.categoria_db}`)
        insertados++
      } catch (e) {
        console.log(`  ERR INSERT ${doc.nombre_completo}: ${e.message}`)
        errs++
      }
    } else {
      const updates = [], values = []
      let idx = 1
      if (doc.titulo_especialidad && doc.titulo_especialidad !== existente.subespecialidad) {
        updates.push(`subespecialidad = $${idx++}`)
        values.push(doc.titulo_especialidad)
      }
      if (doc.consultorio_direccion && doc.consultorio_direccion !== existente.consultorio_direccion) {
        updates.push(`consultorio_direccion = $${idx++}`)
        values.push(doc.consultorio_direccion)
      }
      if (doc.consultorio_ciudad && doc.consultorio_ciudad !== existente.consultorio_ciudad) {
        updates.push(`consultorio_ciudad = $${idx++}`)
        values.push(doc.consultorio_ciudad)
      }
      if (updates.length > 0) {
        values.push(existente.id)
        await pool.query(`UPDATE medicos SET ${updates.join(', ')} WHERE id = $${idx}`, values)
        console.log(`  ~ ${doc.nombre_completo}: ${updates.length} campos actualizados`)
        actualizados++
      } else {
        sinCambio++
      }
    }
  }

  console.log(`\n=== REPORTE FINAL ===`)
  console.log(`Total web: ${allDoctors.length}`)
  console.log(`Nuevos insertados: ${insertados}`)
  console.log(`Actualizados: ${actualizados}`)
  console.log(`Sin cambios: ${sinCambio}`)
  console.log(`Sin especialidad DB: ${sinEsp}`)
  console.log(`Errores: ${errs}`)
  console.log(`Fetch errors: ${errors.length}`)
  if (errors.length) console.log(`  Categorías con error: ${errors.join(', ')}`)

  const total = await pool.query('SELECT COUNT(*) as t FROM medicos WHERE activo = true')
  console.log(`\nDB total post-sync: ${total.rows[0].t}`)
  await pool.end()
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
