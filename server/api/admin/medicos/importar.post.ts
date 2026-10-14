import { parseCSV } from '../../../utils/csv.js'
import { readXlsx } from '../../../utils/xlsx-lite.js'
import { runImport, mapColumns } from '../../../utils/medicos-import.js'

function getField(form: any[], name: string): string | undefined {
  const f = form.find((x: any) => x.name === name && !x.filename)
  return f ? f.data.toString('utf8') : undefined
}

function scoreSheet(rows: string[][]): number {
  const header = rows[0] || []
  const map = mapColumns(header)
  return Object.keys(map.fieldByIndex).length
}

export default defineEventHandler(async (event) => {
  const user = verifyAdminOrAsistenteToken(event)
  const pool = await useDbPool(event)

  const form = await readMultipartFormData(event)
  if (!form || form.length === 0) {
    throw createError({ statusCode: 400, message: 'No se recibió ningún archivo' })
  }

  const file = form.find((f: any) => f.filename)
  if (!file) {
    throw createError({ statusCode: 400, message: 'No se encontró el archivo en la solicitud' })
  }

  const dryRun = getField(form, 'dryRun') === 'true'
  const actualizar = getField(form, 'actualizar') === 'true'
  const enviarConfirmacion = getField(form, 'enviarConfirmacion') === 'true'
  const hojaSolicitada = getField(form, 'hoja')

  const name = String(file.filename || '').toLowerCase()
  let rows: string[][] = []
  let hoja: string | null = null
  let hojasDisponibles: string[] = []

  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) {
    let sheets: { name: string; rows: string[][] }[] = []
    try {
      sheets = readXlsx(file.data)
    } catch (e: any) {
      throw createError({ statusCode: 400, message: 'No se pudo leer el archivo de Excel: ' + (e?.message || '') })
    }
    if (sheets.length === 0) {
      throw createError({ statusCode: 400, message: 'El archivo de Excel no contiene hojas legibles' })
    }
    hojasDisponibles = sheets.map(s => s.name)

    if (hojaSolicitada) {
      const s = sheets.find(x => x.name === hojaSolicitada) || sheets[0]
      rows = s.rows
      hoja = s.name
    } else {
      // Elegir la hoja con más columnas reconocidas
      let best = sheets[0]
      let bestScore = scoreSheet(sheets[0].rows)
      for (const s of sheets.slice(1)) {
        const sc = scoreSheet(s.rows)
        if (sc > bestScore) { best = s; bestScore = sc }
      }
      rows = best.rows
      hoja = best.name
    }
  } else if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = file.data.toString('utf8').replace(/^\uFEFF/, '')
    rows = parseCSV(text)
  } else if (name.endsWith('.xls')) {
    throw createError({ statusCode: 400, message: 'El formato .xls (Excel antiguo) no está soportado. Guarda el archivo como .xlsx o .csv.' })
  } else {
    // Intento genérico: si parece ZIP (xlsx) o texto (csv)
    const isZip = file.data.length > 4 && file.data[0] === 0x50 && file.data[1] === 0x4b
    if (isZip) {
      const sheets = readXlsx(file.data)
      const best = sheets.sort((a, b) => scoreSheet(b.rows) - scoreSheet(a.rows))[0]
      if (!best) throw createError({ statusCode: 400, message: 'No se pudo leer el archivo' })
      rows = best.rows
      hoja = best.name
      hojasDisponibles = sheets.map(s => s.name)
    } else {
      rows = parseCSV(file.data.toString('utf8').replace(/^\uFEFF/, ''))
    }
  }

  if (!rows || rows.length < 2) {
    throw createError({ statusCode: 400, message: 'El archivo debe tener al menos un encabezado y una fila de datos' })
  }

  const result = await runImport(pool, rows, {
    dryRun,
    actualizar,
    enviarConfirmacion,
    usuarioId: (user as any)?.id || null,
    archivo: file.filename || null,
  })

  return { success: true, hoja, hojasDisponibles, ...result }
})
