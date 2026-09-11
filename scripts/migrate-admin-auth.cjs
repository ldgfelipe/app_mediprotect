const fs = require('fs')
const path = require('path')

const adminDir = path.join(process.cwd(), 'server/api/admin')

function getAllTsFiles(dir) {
  const results = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...getAllTsFiles(fullPath))
    } else if (entry.name.endsWith('.ts')) {
      results.push(fullPath)
    }
  }
  return results
}

const files = getAllTsFiles(adminDir)
let fixed = 0

const asistenteAllowed = [
  'pagos.get.ts', 'pagos-estadisticas.get.ts',
  'enviar-confirmacion.post.ts', 'enviar-sms-confirmacion.post.ts',
  'citas.get.ts', 'citas/medico'
]

function isAsistenteAllowed(filePath) {
  const rel = filePath.replace(adminDir, '').replace(/\\/g, '/')
  return asistenteAllowed.some(p => rel.includes(p))
}

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8')

  // Skip if already migrated
  if (content.includes('verifyAdminToken(') || content.includes('verifyAdminOrAsistenteToken(')) {
    continue
  }

  // Skip if no jwt.verify
  if (!content.includes('jwt.verify')) {
    continue
  }

  const fnName = isAsistenteAllowed(filePath) ? 'verifyAdminOrAsistenteToken' : 'verifyAdminToken'

  // Remove import jwt from 'jsonwebtoken'
  content = content.replace(/import jwt from 'jsonwebtoken'\n/g, '')

  // Remove local verifyAdmin function if present
  content = content.replace(/function verifyAdmin\(event: any\) \{[\s\S]*?\}\n/g, '')
  content = content.replace(/verifyAdmin\(event\)/g, `_user`)

  // Find the line with jwt.verify and extract surrounding context
  const lines = content.split('\n')
  let newLines = []
  let i = 0
  let changed = false

  while (i < lines.length) {
    const line = lines[i]

    // Check if this file uses 'decoded' or 'user' variable pattern
    const isDecodedPattern = lines.some(l => l.includes('decoded = jwt.verify') || l.includes('decoded = jwt.verify'))

    // Pattern: const token = getHeader...
    if (line.includes("getHeader(event, 'authorization')") && line.includes('admin_token')) {
      // Found auth header line, now look for the jwt.verify block
      let foundVerify = false
      let j = i

      // Scan forward for jwt.verify (up to 6 lines ahead)
      for (let k = i; k < Math.min(i + 8, lines.length); k++) {
        if (lines[k].includes('jwt.verify')) {
          foundVerify = true

          // Check if uses decoded variable
          if (lines[k].includes('decoded = jwt.verify') || lines[k].includes('user = jwt.verify')) {
            const varMatch = lines[k].match(/(\w+) = jwt\.verify/)
            const varName = varMatch ? varMatch[1] : 'decoded'
            // Replace from i to k with new pattern
            newLines.push(`const _user = ${fnName}(event)`)
            newLines.push(`const ${varName} = _user`)
            i = k + 1
            // Skip catch block
            while (i < lines.length && (lines[i].includes('catch') || lines[i].trim() === '}' || lines[i].trim() === '')) {
              if (lines[i].includes('throw createError') || lines[i].includes("statusCode: 401")) {
                i++
                break
              }
              i++
            }
            changed = true
            break
          } else {
            // Simple jwt.verify pattern (no variable assignment)
            // Replace from i to k with new pattern
            newLines.push(`const _user = ${fnName}(event)`)
            i = k + 1
            // Skip catch block
            while (i < lines.length && (lines[i].includes('catch') || lines[i].trim() === '}' || lines[i].trim() === '')) {
              if (lines[i].includes('throw createError') || lines[i].includes("statusCode: 401")) {
                i++
                break
              }
              i++
            }
            changed = true
            break
          }
        }
      }

      if (!foundVerify) {
        newLines.push(line)
        i++
      }
    } else {
      newLines.push(line)
      i++
    }
  }

  if (changed) {
    // Remove redundant role checks (non-asistente files)
    let result = newLines.join('\n')
    if (!isAsistenteAllowed(filePath)) {
      result = result.replace(/\n\s*if \(user\.tipo !== 'admin' && user\.rol !== 'admin'\) \{\s*\n\s*throw createError\(\{ statusCode: 403, message: '[^']+' \}\)\s*\n\s*\}/g, '')
      result = result.replace(/\n\s*if \(!\['admin', 'asistente', 'Administrador'\]\.includes\(user\.tipo\)\) \{\s*\n\s*throw createError\(\{ statusCode: 403, message: '[^']+' \}\)\s*\n\s*\}/g, '')
    }

    // Clean up multiple blank lines
    result = result.replace(/\n{3,}/g, '\n\n')

    fs.writeFileSync(filePath, result, 'utf8')
    console.log(`FIXED: ${path.relative(process.cwd(), filePath)}`)
    fixed++
  }
}

console.log(`\nFixed ${fixed} files`)
