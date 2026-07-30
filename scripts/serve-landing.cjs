const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 8080
const DIR = 'C:/laragon/www/app_mediprotect/backup-sitio'

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
}

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0]

  // Root -> index.html
  const filePath = url === '/'
    ? path.join(DIR, 'index.html')
    : path.join(DIR, !path.extname(url) ? url + '.html' : url)

  fs.readFile(filePath, (err, data) => {
    if (err) {
      const files = fs.readdirSync(DIR).filter(f => f.endsWith('.html')).map(f => `<li><a href="/${f.replace('.html','')}">${f.replace('.html','')}</a></li>`).join('\n')
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(`<!DOCTYPE html><html><head><title>404</title><style>body{font-family:sans-serif;padding:40px;background:#f9fafb}a{color:#2B7A9F}li{margin:8px 0}</style></head><body><h1>Página no encontrada</h1><p>Esta página no se descargó en la copia local.</p><h3>Páginas disponibles:</h3><ul>${files}</ul><p><a href="/">← Volver al inicio</a></p></body></html>`)
      return
    }

    const ext = path.extname(filePath)
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    res.end(data)
  })
})

server.listen(PORT, () => {
  console.log(`Landing site local: http://localhost:${PORT}`)
  console.log(`CRM local: http://localhost:3000`)
  console.log(`Serving: ${DIR}`)
})
