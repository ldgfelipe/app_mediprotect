
function parseCSV(text) {
  const lines = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === '\n') {
        lines.push(current)
        current = ''
      } else if (ch === '\r') {
        continue
      } else {
        current += ch
      }
    }
  }
  if (current) lines.push(current)

  return lines.map(line => {
    const fields = []
    let field = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (q) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            field += '"'
            i++
          } else {
            q = false
          }
        } else {
          field += ch
        }
      } else {
        if (ch === '"') {
          q = true
        } else if (ch === ',') {
          fields.push(field)
          field = ''
        } else {
          field += ch
        }
      }
    }
    fields.push(field)
    return fields
  })
}

function isValidIdentifier(name) {
  return /^[a-z_][a-z0-9_]*$/.test(name)
}

export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const body = await readBody(event)
  const tabla = body.tabla
  if (!tabla || !isValidIdentifier(tabla)) {
    throw createError({ statusCode: 400, message: 'Nombre de tabla inválido' })
  }

  const pool = useDbPool(event)

  const colRes = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`,
    [tabla]
  )
  if (colRes.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Tabla no encontrada' })
  }

  const validColumns = colRes.rows.map((r: any) => r.column_name)
  const pkColumn = validColumns[0]

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'No se recibió archivo' })
  }

  const file = formData.find(f => f.filename)
  if (!file) {
    throw createError({ statusCode: 400, message: 'No se encontró archivo en la solicitud' })
  }

  const text = file.data.toString('utf-8')
  const bom = '\uFEFF'
  const clean = text.startsWith(bom) ? text.slice(1) : text
  const lines = parseCSV(clean)

  if (lines.length < 2) {
    throw createError({ statusCode: 400, message: 'El CSV debe tener al menos encabezado y una fila de datos' })
  }

  const headers = lines[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const invalidCols = headers.filter(h => !validColumns.includes(h))
  if (invalidCols.length > 0) {
    throw createError({ statusCode: 400, message: `Columnas no válidas: ${invalidCols.join(', ')}` })
  }

  const dataLines = lines.slice(1).filter(l => l.some(f => f.trim() !== ''))
  let inserted = 0
  let errors = 0

  for (const line of dataLines) {
    const values = {}
    headers.forEach((h, i) => {
      values[h] = line[i] !== undefined ? line[i].trim() : null
    })

    const cols = Object.keys(values).filter(k => values[k] !== null && values[k] !== '')
    const placeholders = cols.map((_, i) => `$${i + 1}`)
    const vals = cols.map(c => values[c])

    const setClause = cols.map((c, i) => `${c} = EXCLUDED.${c}`).join(', ')

    try {
      await pool.query(
        `INSERT INTO ${tabla} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (${pkColumn}) DO UPDATE SET ${setClause}`,
        vals
      )
      inserted++
    } catch (err) {
      errors++
    }
  }

  return { inserted, errors, total: dataLines.length }
})
