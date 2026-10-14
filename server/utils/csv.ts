/**
 * Parser CSV sin dependencias. Detecta automáticamente el separador (coma, punto y coma o tab)
 * a partir de la primera línea y soporta comillas dobles escapadas.
 */

export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find(l => l.trim() !== '') || ''
  const candidates = [',', ';', '\t', '|']
  let best = ','
  let bestCount = 0
  for (const d of candidates) {
    let count = 0
    let inQuotes = false
    for (let i = 0; i < firstLine.length; i++) {
      const ch = firstLine[i]
      if (ch === '"') inQuotes = !inQuotes
      else if (ch === d && !inQuotes) count++
    }
    if (count > bestCount) { bestCount = count; best = d }
  }
  return best
}

export function parseCSV(text: string, delimiter?: string): string[][] {
  const delim = delimiter || detectDelimiter(text)
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === delim) { row.push(field); field = '' }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (ch === '\r') { /* ignorar */ }
      else field += ch
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}
