const fs = require('fs')
const path = require('path')

const backupDir = 'C:/laragon/www/app_mediprotect/backup-sitio'

// Buscar todas las URLs de imágenes en todas las páginas HTML
const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.html'))
const allImages = new Map()

for (const file of files) {
  const html = fs.readFileSync(path.join(backupDir, file), 'utf8')
  
  // Buscar URLs de imagedelivery.net (Cloudflare Images)
  const imgMatches = html.match(/https?:\/\/imagedelivery\.net\/[^"'\s<>)]+/g) || []
  
  // Buscar URLs de assets/provider (fotos de médicos)
  const assetMatches = html.match(/\/assets\/provider\/[^"'\s<>)]+/g) || []
  
  for (const url of imgMatches) {
    if (!allImages.has(url)) allImages.set(url, [])
    allImages.get(url).push(file)
  }
  for (const url of assetMatches) {
    const full = 'https://www.mediprotect.com.mx' + url
    if (!allImages.has(full)) allImages.set(full, [])
    allImages.get(full).push(file)
  }
}

console.log(`\nTotal imágenes únicas encontradas: ${allImages.size}\n`)

// Buscar específicamente fotos de médicos (patrón avatar/foto en tarjetas)
for (const [url, files] of allImages) {
  // Filtrar solo imágenes que parecen fotos de médicos
  if (url.includes('upload-') || url.includes('avatar') || url.includes('doctor') || url.includes('profile') || url.includes('foto')) {
    console.log(`  ${url}`)
    console.log(`    En: ${files.join(', ')}`)
  }
}

console.log('\n--- Todas las URLs ---')
for (const [url, files] of allImages) {
  console.log(`  ${url.substring(0, 120)}${url.length > 120 ? '...' : ''}`)
}
