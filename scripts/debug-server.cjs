const http = require('http')
const fs = require('fs')
const path = require('path')

const DIR = 'C:/laragon/www/app_mediprotect/backup-sitio'
const server = http.createServer((req, res) => {
  console.log('REQ:', req.url)
  let url = req.url.split('?')[0]
  if (!path.extname(url)) url += '.html'
  const fp = path.join(DIR, url === '/' ? 'index.html' : url)
  console.log('FILE:', fp)
  console.log('EXISTS:', fs.existsSync(fp))
  if (fs.existsSync(fp)) {
    const data = fs.readFileSync(fp)
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.end(data)
  } else {
    res.writeHead(404)
    res.end('Not found: ' + fp)
  }
})
server.listen(8080, () => console.log('Debug server on 8080'))
