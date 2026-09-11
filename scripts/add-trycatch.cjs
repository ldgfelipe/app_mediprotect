const fs = require('fs')
const path = require('path')

const apiDir = path.join(process.cwd(), 'server/api')

function getAllTsFiles(dir) {
  const results = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...getAllTsFiles(fullPath))
      } else if (entry.name.endsWith('.ts')) {
        results.push(fullPath)
      }
    }
  } catch (e) {}
  return results
}

const files = getAllTsFiles(apiDir)
let fixed = 0

// Public endpoints (no auth needed, but need try/catch)
const publicEndpoints = [
  'especialidades.get.ts',
  'paquetes.get.ts',
  'directorio-medico.get.ts',
  'directorio-medico/[slug].get.ts',
  'directorio-medico/perfil/[id].get.ts',
  'directorio-medico/categorias.get.ts',
  'medicos.get.ts',
  'medicos/[id].get.ts',
  'medicos/listar-public.get.ts',
  'perfil.get.ts',
  'config/verificacion.get.ts',
  'sepomex/colonias.get.ts',
  'curp/validar.get.ts',
  'pre-registro.get.ts',
  'disponibilidad/[id_medico].get.ts',
  'pagos/configuracion.get.ts',
]

// Auth endpoints that need try/catch
const authEndpoints = [
  'auth/perfil.get.ts',
  'auth/perfil.put.ts',
  'auth/login-asistente.post.ts',
  'mis-comisiones.get.ts',
  'paquetes/mi-plan.get.ts',
]

// Citas endpoints
const citasEndpoints = [
  'citas.post.ts',
  'citas/mis-citas.get.ts',
  'citas/mi-agenda.get.ts',
  'citas/mis-pacientes.get.ts',
  'citas/[id]/finalizar.put.ts',
  'citas/[id]/confirmar.put.ts',
  'citas/[id]/cancelar.put.ts',
]

// Disponibilidad endpoints
const disponibilidadEndpoints = [
  'disponibilidad.post.ts',
  'disponibilidad/[id].delete.ts',
]

const allEndpoints = [...publicEndpoints, ...authEndpoints, ...citasEndpoints, ...disponibilidadEndpoints]

for (const filePath of files) {
  let relPath = path.relative(apiDir, filePath).replace(/\\/g, '/')

  if (!allEndpoints.includes(relPath)) continue

  let content = fs.readFileSync(filePath, 'utf8')

  // Skip if already has try/catch around the handler body
  if (content.includes('try {') && content.includes('} catch')) continue

  // Pattern: defineEventHandler(async (event) => { ... })
  // We need to wrap the body in try/catch
  const handlerRegex = /(export default defineEventHandler\(async \(event\) => \{)/
  const match = content.match(handlerRegex)

  if (!match) continue

  const insertPoint = content.indexOf(match[1]) + match[1].length

  // Find the last } of the handler (should be the closing of defineEventHandler)
  // We need to find the matching closing brace
  let braceCount = 0
  let handlerEnd = -1
  let inString = false
  let stringChar = ''

  for (let i = insertPoint; i < content.length; i++) {
    const ch = content[i]

    if (inString) {
      if (ch === stringChar && content[i-1] !== '\\') inString = false
      continue
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      inString = true
      stringChar = ch
      continue
    }

    if (ch === '{') braceCount++
    if (ch === '}') {
      braceCount--
      if (braceCount === 0) {
        handlerEnd = i
        break
      }
    }
  }

  if (handlerEnd === -1) continue

  // Extract handler body
  const before = content.substring(0, insertPoint)
  const body = content.substring(insertPoint, handlerEnd)
  const after = content.substring(handlerEnd)

  // Skip if body already contains try
  if (body.trim().startsWith('try')) continue

  // Add try/catch wrapper
  const newContent = before + '\n  try {' + body + '\n  } catch (err: any) {\n    throw createError({ statusCode: 500, message: err?.message || \'Error interno del servidor\' })\n  }' + after

  fs.writeFileSync(filePath, newContent, 'utf8')
  console.log(`FIXED: ${relPath}`)
  fixed++
}

console.log(`\nAdded try/catch to ${fixed} files`)
