import { readFileSync, writeFileSync } from 'fs'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgresql://postgres:Mobiltoo111213@db.mruezojnfgkdhtgxwgmv.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

// Get all doctors that need profile data
const { rows: doctors } = await pool.query(
  `SELECT id, slug, nombre, apellido, titulo, perfil_url,
          COALESCE(jsonb_array_length(servicios), 0) as svc_len,
          COALESCE(jsonb_array_length(formacion_academica), 0) as form_len,
          bio IS NOT NULL as has_bio
   FROM medicos WHERE activo = true
   ORDER BY titulo, nombre`
)

console.log(`Total doctors: ${doctors.length}`)
console.log(`Missing profile data: ${doctors.filter(d => !d.has_bio && d.svc_len === 0).length}`)

// Generate candidate slugs for perfil-dr / perfil-dra pattern
// Site uses: nombre (including middle name) + primer apellido only
function transliterate(s) {
  const map = { 'á': 'a','é': 'e','í': 'i','ó': 'o','ú': 'u','ü': 'u','ñ': 'n','Á': 'a','É': 'e','Í': 'i','Ó': 'o','Ú': 'u','Ü': 'u','Ñ': 'n' }
  return s.replace(/[áéíóúüñÁÉÍÓÚÜÑ]/g, c => map[c] || c).toLowerCase()
}

function generateProfileSlug(nombre, apellido) {
  let parts = []
  // Nombre may include middle name: "Erasmo Aaron" -> ["Erasmo", "Aaron"]
  const nombreParts = nombre.trim().split(/\s+/)
  // Apellido may include both: "Vega Osorio" -> ["Vega", "Osorio"]
  const apellidoParts = apellido.trim().split(/\s+/)
  // Use full nombre + first apellido
  parts = [...nombreParts, apellidoParts[0]]
  return parts.map(p => transliterate(p)).join('-')
}

function generateDbSlug(nombre, apellido) {
  return transliterate(nombre + '-' + apellido).replace(/[^a-z0-9-]/g, '-')
}

function getPrefix(titulo) {
  const t = titulo.toLowerCase()
  if (t.startsWith('dra') || t === 'lic.' || t === 'ln.' || t === 'enf.' || t === 'enf. esp.') return 'perfil-dra'
  return 'perfil-dr'
}

// Generate all candidate URLs
const candidates = []
for (const d of doctors) {
  const urls = []
  // Already known URL (from red-medica pattern)
  if (d.perfil_url) {
    urls.push({ url: d.perfil_url, source: 'known' })
  } else {
    // Try red-medica/db-slug
    urls.push({ url: `https://www.mediprotect.com.mx/red-medica/${d.slug}`, source: 'red-medica' })
    // Try perfil-dr/dra + generated slug
    const genSlug = generateProfileSlug(d.nombre, d.apellido)
    const prefix = getPrefix(d.titulo)
    urls.push({ url: `https://www.mediprotect.com.mx/${prefix}-${genSlug}`, source: `${prefix}-generated` })
    // Also try with full apellido (both last names) for perfil-dr/dra
    urls.push({ url: `https://www.mediprotect.com.mx/${prefix}-${d.slug}`, source: `${prefix}-dbslug` })
  }
  candidates.push({ doctor: d, urls })
}

// Test URLs in batches
async function checkUrl(url) {
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) })
    return { url, status: resp.status, ok: resp.ok }
  } catch {
    return { url, status: 0, ok: false }
  }
}

const results = []
const total = candidates.length
let checked = 0

for (const c of candidates) {
  for (const u of c.urls) {
    const r = await checkUrl(u.url)
    u.status = r.status
    u.ok = r.ok
  }
  const working = c.urls.find(u => u.ok)
  results.push({
    slug: c.doctor.slug,
    nombre: c.doctor.nombre,
    apellido: c.doctor.apellido,
    titulo: c.doctor.titulo,
    has_data: c.doctor.has_bio || c.doctor.svc_len > 0,
    urls: c.urls.map(u => ({ url: u.url.replace('https://www.mediprotect.com.mx', ''), status: u.status, ok: u.ok })),
    working_url: working ? working.url.replace('https://www.mediprotect.com.mx', '') : null
  })
  checked++
  if (checked % 20 === 0) console.log(`Checked ${checked}/${total}`)
}

// Summary
const withProfile = results.filter(r => r.working_url)
console.log(`\n=== RESULTS ===`)
console.log(`Doctors with working profile URLs: ${withProfile.length}`)
for (const r of withProfile) {
  console.log(`  ${r.titulo} ${r.nombre} ${r.apellido} -> ${r.working_url}`)
}

const withoutData = results.filter(r => !r.has_data && r.working_url)
console.log(`\nDoctors missing profile data but HAVE a profile URL to scrape: ${withoutData.length}`)

writeFileSync('_url-results.json', JSON.stringify(results, null, 2))
console.log('\nResults saved to _url-results.json')
await pool.end()
