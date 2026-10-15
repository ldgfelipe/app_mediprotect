/**
 * Conversión y validación de valores de celda para la vista tipo Excel.
 * Lanza Error con mensaje legible cuando el valor no es válido.
 */
import type { HojaColumna } from './hoja-recursos.js'

export class CeldaError extends Error {
  columna: string
  constructor(columna: string, message: string) {
    super(message)
    this.name = 'CeldaError'
    this.columna = columna
  }
}

const VERDADEROS = ['true', '1', 'si', 'sí', 'x', 'verdadero', 'activo', 'yes', 'y', 'ok']

/** Acepta yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy y números de serie de Excel. */
export function normalizarFecha(valor: string): string | null {
  const s = String(valor || '').trim()
  if (!s) return null

  // Serial de Excel (solo dígitos)
  if (/^\d{5}$/.test(s)) {
    const serial = parseInt(s, 10)
    const ms = (serial - 25569) * 86400 * 1000
    const d = new Date(ms)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }

  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (iso) {
    return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`
  }
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/)
  if (dmy) {
    let anio = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
    return `${anio}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  throw new Error(`Fecha inválida: "${s}" (usa aaaa-mm-dd o dd/mm/aaaa)`)
}

export function coercionarCelda(col: HojaColumna, valor: any): any {
  if (valor === null || valor === undefined) return null
  const s = String(valor).trim()

  if (col.type === 'boolean') {
    if (s === '') return null
    return VERDADEROS.includes(s.toLowerCase())
  }

  if (s === '') return null

  switch (col.type) {
    case 'number': {
      const n = Number(s.replace(/[^0-9.\-]/g, ''))
      if (!isFinite(n)) throw new Error(`"${s}" no es un número válido`)
      return n
    }
    case 'email': {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error(`Correo inválido: "${s}"`)
      return s.toLowerCase()
    }
    case 'phone': {
      let d = s.replace(/\D/g, '')
      if (d.length === 13 && d.startsWith('521')) d = d.slice(3)
      else if (d.length === 12 && d.startsWith('52')) d = d.slice(2)
      if (d && d.length !== 10) throw new Error(`El teléfono debe tener 10 dígitos: "${s}"`)
      return d || null
    }
    case 'curp': {
      const u = s.toUpperCase()
      if (u && !/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(u)) throw new Error(`CURP inválida: "${s}"`)
      return u || null
    }
    case 'date':
      return normalizarFecha(s)
    case 'datetime': {
      const d = new Date(s)
      if (isNaN(d.getTime())) throw new Error(`Fecha/hora inválida: "${s}"`)
      return d.toISOString()
    }
    default:
      return s
  }
}

/** Valida y convierte un objeto {columna: valor} contra el catálogo de columnas. */
export function coercionarCambios(
  columnas: HojaColumna[],
  cambios: Record<string, any>
): { cols: string[]; valores: any[] } {
  const cols: string[] = []
  const valores: any[] = []
  for (const [key, valor] of Object.entries(cambios || {})) {
    const col = columnas.find(c => c.key === key)
    if (!col) throw new CeldaError(key, `Campo no editable o desconocido: "${key}"`)
    try {
      valores.push(coercionarCelda(col, valor))
      cols.push(key)
    } catch (e: any) {
      throw new CeldaError(key, e?.message || 'Valor inválido')
    }
  }
  return { cols, valores }
}
