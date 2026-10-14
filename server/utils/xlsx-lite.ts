import zlib from 'node:zlib'

/**
 * Lector mínimo y sin dependencias de archivos .xlsx (Office Open XML).
 * Soporta: cadenas compartidas, cadenas en línea, números, booleanos y fechas (serial).
 * No soporta: fórmulas con caché ausente, formatos exóticos, hojas ocultas con fórmulas dinámicas.
 */

export interface XlsxSheet {
  name: string
  rows: string[][]
}

const SIG_EOCD = 0x06054b50
const SIG_CEN = 0x02014b50
const SIG_LOC = 0x04034b50

interface ZipEntry {
  name: string
  method: number
  compSize: number
  uncompSize: number
  localOffset: number
}

function findEOCD(buf: Buffer): number {
  const min = Math.max(0, buf.length - 22 - 0xffff)
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) return i
  }
  return -1
}

function readEntries(buf: Buffer): ZipEntry[] {
  const eocd = findEOCD(buf)
  if (eocd < 0) throw new Error('El archivo no es un .xlsx válido (ZIP no encontrado)')
  let total = buf.readUInt16LE(eocd + 10)
  let cdOffset = buf.readUInt32LE(eocd + 16)

  // Soporte ZIP64 (archivos grandes)
  if (total === 0xffff || cdOffset === 0xffffffff) {
    const loc = eocd - 20
    if (loc >= 0 && buf.readUInt32LE(loc) === 0x07064b50) {
      const z64off = Number(buf.readBigUInt64LE(loc + 8))
      if (buf.readUInt32LE(z64off) === 0x06064b50) {
        total = Number(buf.readBigUInt64LE(z64off + 32))
        cdOffset = Number(buf.readBigUInt64LE(z64off + 48))
      }
    }
  }

  const entries: ZipEntry[] = []
  let p = cdOffset
  for (let i = 0; i < total; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== SIG_CEN) break
    const method = buf.readUInt16LE(p + 10)
    let compSize = buf.readUInt32LE(p + 20)
    let uncompSize = buf.readUInt32LE(p + 24)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)

    // ZIP64 extra field
    if (compSize === 0xffffffff || uncompSize === 0xffffffff || localOffset === 0xffffffff) {
      const extraStart = p + 46 + nameLen
      let e = extraStart
      const extraEnd = extraStart + extraLen
      while (e + 4 <= extraEnd) {
        const id = buf.readUInt16LE(e)
        const size = buf.readUInt16LE(e + 2)
        if (id === 0x0001) {
          let z = e + 4
          if (uncompSize === 0xffffffff) { uncompSize = Number(buf.readBigUInt64LE(z)); z += 8 }
          if (compSize === 0xffffffff) { compSize = Number(buf.readBigUInt64LE(z)); z += 8 }
          break
        }
        e += 4 + size
      }
    }

    entries.push({ name, method, compSize, uncompSize, localOffset })
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

function readEntryData(buf: Buffer, e: ZipEntry): Buffer {
  const lo = e.localOffset
  if (buf.readUInt32LE(lo) !== SIG_LOC) throw new Error('Entrada ZIP inválida')
  const nameLen = buf.readUInt16LE(lo + 26)
  const extraLen = buf.readUInt16LE(lo + 28)
  const start = lo + 30 + nameLen + extraLen
  const comp = buf.subarray(start, start + e.compSize)
  if (e.method === 0) return comp
  if (e.method === 8) return zlib.inflateRawSync(comp)
  throw new Error('Método de compresión no soportado: ' + e.method)
}

function xmlDecode(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&')
}

function colToIndex(letters: string): number {
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function textOf(fragment: string): string {
  const parts: string[] = []
  const re = /<t[^>]*>([\s\S]*?)<\/t>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(fragment))) parts.push(xmlDecode(m[1]))
  return parts.join('')
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = []
  const re = /<si>([\s\S]*?)<\/si>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) out.push(textOf(m[1]))
  return out
}

function parseSheetRows(xml: string, shared: string[]): string[][] {
  const rows: string[][] = []
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g
  let rm: RegExpExecArray | null
  while ((rm = rowRe.exec(xml))) {
    const body = rm[1]
    const rowIdx = /<row\b[^>]*\sr="(\d+)"/.exec(rm[0])
    const rIndex = rowIdx ? parseInt(rowIdx[1], 10) - 1 : rows.length
    const cells: string[] = []
    const cellRe = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g
    let cm: RegExpExecArray | null
    while ((cm = cellRe.exec(body))) {
      const attrs = cm[1] || ''
      const inner = cm[2] || ''
      const refM = /r="([A-Z]+)\d+"/.exec(attrs)
      const cIdx = refM ? colToIndex(refM[1]) : cells.length
      const tM = /t="([^"]+)"/.exec(attrs)
      const type = tM ? tM[1] : 'n'
      let val = ''
      if (type === 'inlineStr' || /<is>/.test(inner)) {
        val = textOf(inner)
      } else {
        const vM = /<v>([\s\S]*?)<\/v>/.exec(inner)
        const raw = vM ? xmlDecode(vM[1]) : ''
        if (type === 's') {
          const idx = parseInt(raw, 10)
          val = Number.isFinite(idx) ? (shared[idx] ?? '') : ''
        } else {
          val = raw
        }
      }
      while (cells.length < cIdx) cells.push('')
      cells[cIdx] = val
    }
    while (rows.length < rIndex) rows.push([])
    rows[rIndex] = cells
  }
  return rows
}

const WORKSHEET_PREFIX = 'xl/worksheets/'

export function readXlsx(buffer: Buffer): XlsxSheet[] {
  const entries = readEntries(buffer)
  const byName = new Map<string, ZipEntry>()
  for (const e of entries) byName.set(e.name, e)

  const read = (name: string): Buffer | null => {
    const e = byName.get(name)
    return e ? readEntryData(buffer, e) : null
  }
  const readText = (name: string): string | null => {
    const d = read(name)
    return d ? d.toString('utf8') : null
  }

  // Cadenas compartidas
  let shared: string[] = []
  const ss = readText('xl/sharedStrings.xml')
  if (ss) shared = parseSharedStrings(ss)

  // Orden y nombres de hojas desde workbook.xml + rels
  const sheetList: { name: string; target: string }[] = []
  const workbook = readText('xl/workbook.xml')
  const rels = readText('xl/_rels/workbook.xml.rels')
  if (workbook) {
    const relMap = new Map<string, string>()
    if (rels) {
      const rre = /<Relationship\b([^>]*)\/?>/g
      let m: RegExpExecArray | null
      while ((m = rre.exec(rels))) {
        const id = /Id="([^"]+)"/.exec(m[1])?.[1]
        const target = /Target="([^"]+)"/.exec(m[1])?.[1]
        if (id && target) relMap.set(id, target)
      }
    }
    const sre = /<sheet\b([^>]*)\/?>/g
    let m: RegExpExecArray | null
    while ((m = sre.exec(workbook))) {
      const name = /name="([^"]*)"/.exec(m[1])?.[1] ?? ''
      const rid = /r:id="([^"]+)"/.exec(m[1])?.[1] ?? ''
      let target = relMap.get(rid) || ''
      if (target.startsWith('/')) target = target.slice(1)
      else if (target && !target.startsWith('xl/')) target = 'xl/' + target
      sheetList.push({ name: xmlDecode(name), target })
    }
  }

  // Fallback: tomar archivos de worksheet ordenados
  if (sheetList.length === 0) {
    const sheets = entries
      .map(e => e.name)
      .filter(n => n.startsWith(WORKSHEET_PREFIX) && n.endsWith('.xml'))
      .sort()
    sheets.forEach((n, i) => sheetList.push({ name: `Hoja${i + 1}`, target: n }))
  }

  const result: XlsxSheet[] = []
  for (const s of sheetList) {
    const xml = readText(s.target)
    if (!xml) continue
    result.push({ name: s.name, rows: parseSheetRows(xml, shared) })
  }
  return result
}

/** Convierte un serial de fecha de Excel a YYYY-MM-DD (considera el bug del año 1900). */
export function excelSerialToISO(n: number): string {
  if (!Number.isFinite(n)) return ''
  const utc = Math.round((n - 25569) * 86400 * 1000)
  const d = new Date(utc)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}
