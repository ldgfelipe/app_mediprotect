import { excelSerialToISO } from './xlsx-lite.js'
import { createMedico, MedicoInputError } from './create-medico.js'

export type ImportStatus = 'nuevo' | 'actualizar' | 'duplicado' | 'error' | 'insertado' | 'actualizado'

export interface ImportRowResult {
  fila: number
  status: ImportStatus
  mensaje?: string
  nombre?: string
  email?: string
  cedula?: string
  telefono?: string
  datos: Record<string, any>
}

export interface ImportResult {
  total: number
  insertados: number
  actualizados: number
  duplicados: number
  errores: number
  columnas: Record<string, string>
  columnasNoReconocidas: string[]
  filas: ImportRowResult[]
}

// ---------- Normalización de encabezados ----------

function normHeader(h: string): string {
  return String(h || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Sinónimos: campo canónico -> posibles encabezados (ya normalizados)
const SYNONYMS: Record<string, string[]> = {
  nombre_completo: ['NOMBRE COMPLETO', 'NOMBRE Y APELLIDOS', 'NOMBRE DEL MEDICO', 'NOMBRE MEDICO', 'MEDICO', 'DOCTOR'],
  nombre: ['NOMBRE', 'NOMBRES', 'NOMBRE S', 'PRIMER NOMBRE'],
  apellido_paterno: ['APELLIDO PATERNO', 'PRIMER APELLIDO', 'APELLIDO 1'],
  apellido_materno: ['APELLIDO MATERNO', 'SEGUNDO APELLIDO', 'APELLIDO 2'],
  apellido: ['APELLIDO', 'APELLIDOS', 'APELLIDO S'],
  cedula_profesional: ['CEDULA PROFESIONAL', 'CEDULA', 'CEDULA PROF', 'CEDULA PROFESIONAL NO'],
  especialidad: ['ESPECIALIDAD', 'ESPECIALIDADES', 'ESPECIALIDAD MEDICA'],
  telefono: ['TELEFONO WHATSAPP 10 DIGITOS', 'TELEFONO WHATSAPP', 'TELEFONO', 'WHATSAPP', 'CELULAR', 'TELEFONO CELULAR', 'TELEFONO MOVIL', 'MOVIL', 'TEL', 'TELEFONO 1'],
  telefono2: ['TELEFONO 2', 'TELEFONO ALTERNO', 'TELEFONO SECUNDARIO', 'SEGUNDO TELEFONO', 'TEL 2'],
  email: ['CORREO', 'EMAIL', 'CORREO ELECTRONICO', 'E MAIL', 'MAIL', 'CORREO E'],
  ciudad: ['CIUDAD', 'MUNICIPIO', 'LOCALIDAD', 'DELEGACION'],
  consultorio_direccion: ['DIRECCION CONSULTORIO', 'DIRECCION', 'DOMICILIO CONSULTORIO', 'DIRECCION DEL CONSULTORIO', 'DIRECCION CONSULTORIO 1'],
  consultorio_estado: ['ESTADO', 'ENTIDAD', 'ESTADO REPUBLICA', 'ESTADO DE LA REPUBLICA'],
  colonia: ['COLONIA'],
  codigo_postal: ['CODIGO POSTAL', 'CP', 'C P', 'CODIGO POSTAL CP', 'ZIP'],
  hospital_consultorio: ['HOSPITAL CONSULTORIO', 'HOSPITAL', 'CENTRO MEDICO', 'CONSULTORIO', 'CLINICA', 'HOSPITAL O CONSULTORIO'],
  rfc: ['RFC'],
  curp: ['CURP'],
  titulo: ['TITULO', 'PREFIJO', 'GRADO', 'TRATAMIENTO'],
  usuario: ['USUARIO', 'USER', 'NOMBRE DE USUARIO'],
  password: ['PASSWORD', 'CONTRASENA', 'PASSWORD TEMPORAL', 'CONTRASENA TEMPORAL', 'PWD'],
  comision_por_cita: ['COMISION POR CITA MXN', 'COMISION POR CITA', 'COMISION MXN', 'COMISION', 'MONTO COMISION', 'COMISION POR CITA MXN 1'],
  comision_tipo: ['NIVEL COMISION', 'COMISION TIPO', 'NIVEL', 'TIPO COMISION'],
  convenio_firmado: ['CONVENIO FIRMADO', 'CONVENIO', 'FIRMO CONVENIO'],
  fecha_firma_convenio: ['FECHA FIRMA CONVENIO', 'FECHA DEL CONVENIO', 'FECHA CONVENIO', 'FIRMA CONVENIO'],
  fecha_afiliacion: ['FECHA AFILIACION', 'FECHA DE AFILIACION', 'FECHA ALTA', 'AFILIACION'],
  advertencias: ['ADVERTENCIAS', 'ADVERTENCIA', 'NUMERO DE ADVERTENCIAS'],
  notas: ['NOTAS', 'OBSERVACIONES', 'COMENTARIOS', 'NOTA'],
  precio_regular: ['PRECIO REGULAR', 'PRECIO', 'COSTO CONSULTA', 'TARIFA'],
  precio_miembro: ['PRECIO MIEMBRO', 'PRECIO PROMOCION', 'PRECIO MIEMBROS', 'PRECIO DESCUENTO'],
  universidad: ['UNIVERSIDAD', 'ESCUELA', 'INSTITUCION'],
  tipo_consulta: ['TIPO CONSULTA', 'MODALIDAD', 'TIPO DE CONSULTA'],
  bio: ['BIO', 'BIOGRAFIA', 'ACERCA DE', 'DESCRIPCION'],
  subespecialidad: ['SUBESPECIALIDAD', 'SUB ESPECIALIDAD'],
}

const SYNONYM_INDEX: Record<string, string> = {}
for (const [field, list] of Object.entries(SYNONYMS)) {
  for (const syn of list) if (!SYNONYM_INDEX[syn]) SYNONYM_INDEX[syn] = field
}

export interface ColumnMap {
  fieldByIndex: Record<number, string>
  columnas: Record<string, string>
  columnasNoReconocidas: string[]
}

export function mapColumns(headers: string[]): ColumnMap {
  const fieldByIndex: Record<number, string> = {}
  const columnas: Record<string, string> = {}
  const columnasNoReconocidas: string[] = []
  const used = new Set<string>()

  headers.forEach((h, i) => {
    const norm = normHeader(h)
    if (!norm) return
    const field = SYNONYM_INDEX[norm]
    if (field && !used.has(field)) {
      fieldByIndex[i] = field
      columnas[field] = String(h).trim()
      used.add(field)
    } else if (!field) {
      columnasNoReconocidas.push(String(h).trim())
    }
  })

  return { fieldByIndex, columnas, columnasNoReconocidas }
}

// ---------- Limpieza / normalización de valores ----------

function clean(v: any): string {
  if (v === null || v === undefined) return ''
  return String(v).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizePhone(v: any): string {
  let s = String(v ?? '').replace(/\D/g, '')
  if (s.length === 13 && s.startsWith('521')) s = s.slice(3)
  else if (s.length === 12 && s.startsWith('52')) s = s.slice(2)
  else if (s.length === 11 && s.startsWith('1')) s = s.slice(1)
  return s
}

function parseBool(v: any): boolean | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const s = String(v).trim().toUpperCase()
  if (['SI', 'SÍ', 'S', 'YES', 'Y', 'TRUE', '1', 'X', 'VERDADERO', 'FIRMADO'].includes(s)) return true
  if (['NO', 'N', 'FALSE', '0', 'FALSO'].includes(s)) return false
  return undefined
}

function parseNum(v: any): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : null
}

export function parseDateValue(v: any): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  if (!s) return null
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s)
    if (n > 20000 && n < 80000) return excelSerialToISO(n)
  }
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

const TITLE_RE = /^(DRA?\.?|DOCTORA?|LIC\.?|LICENCIADA?|ENF\.?|LN\.?|PSIC\.?|PSICOLOG[OA]|NUT\.?|NUTRIOLOG[OA]|QFB|M\.?D\.?)\s+/i

const CURP_RE = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/

function splitNombreCompleto(raw: string): { titulo?: string; nombre: string; apellido_paterno: string; apellido_materno: string } {
  let s = clean(raw)
  let titulo: string | undefined
  const tm = s.match(TITLE_RE)
  if (tm) {
    titulo = tm[1].toUpperCase()
    if (!/[.\d]$/.test(titulo)) titulo = titulo + '.'
    s = s.slice(tm[0].length).trim()
  }
  const tokens = s.split(' ').filter(Boolean)
  if (tokens.length === 0) return { titulo, nombre: '', apellido_paterno: '', apellido_materno: '' }
  if (tokens.length === 1) return { titulo, nombre: tokens[0], apellido_paterno: '', apellido_materno: '' }
  if (tokens.length === 2) return { titulo, nombre: tokens[0], apellido_paterno: tokens[1], apellido_materno: '' }
  // 3+ : los dos últimos son los apellidos (heurística para nombres compuestos)
  const apellido_materno = tokens[tokens.length - 1]
  const apellido_paterno = tokens[tokens.length - 2]
  const nombre = tokens.slice(0, tokens.length - 2).join(' ')
  return { titulo, nombre, apellido_paterno, apellido_materno }
}

const SELECTOR_RE = /^MED-\d+\s·|^MED-\d+\s*·/

function buildRecord(row: string[], map: ColumnMap): { datos: Record<string, any>; errores: string[] } {
  const raw: Record<string, any> = {}
  for (const [idxStr, field] of Object.entries(map.fieldByIndex)) {
    raw[field] = row[Number(idxStr)] ?? ''
  }

  const errores: string[] = []
  const datos: Record<string, any> = {}

  // Nombre
  let titulo: string | undefined = clean(raw.titulo) ? clean(raw.titulo) : undefined
  if (clean(raw.nombre_completo)) {
    const parts = splitNombreCompleto(raw.nombre_completo)
    datos.nombre = parts.nombre
    datos.apellido_paterno = parts.apellido_paterno
    datos.apellido_materno = parts.apellido_materno
    if (!titulo && parts.titulo) titulo = parts.titulo
    // Si además vienen columnas separadas, respetarlas
    if (clean(raw.nombre)) datos.nombre = clean(raw.nombre)
    if (clean(raw.apellido_paterno)) datos.apellido_paterno = clean(raw.apellido_paterno)
    if (clean(raw.apellido_materno)) datos.apellido_materno = clean(raw.apellido_materno)
  } else {
    datos.nombre = clean(raw.nombre)
    datos.apellido_paterno = clean(raw.apellido_paterno) || clean(raw.apellido)
    datos.apellido_materno = clean(raw.apellido_materno)
  }
  if (titulo) datos.titulo = titulo

  if (!datos.nombre) errores.push('Falta el nombre')
  if (!datos.apellido_paterno && !datos.apellido_materno) errores.push('Falta el apellido')

  // Cédula / correo / teléfono
  const cedula = clean(raw.cedula_profesional)
  const cedulaLimpia = cedula.replace(/[^0-9A-Za-z]/g, '')
  if (cedulaLimpia && cedulaLimpia !== '0') datos.cedula_profesional = cedulaLimpia

  const email = clean(raw.email).toLowerCase()
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push(`Correo inválido: ${email}`)
    else datos.email = email
  }

  const telRaw = clean(raw.telefono)
  if (telRaw) {
    const tel = normalizePhone(telRaw)
    if (tel.length !== 10) errores.push(`Teléfono inválido: ${telRaw}`)
    else datos.telefono = tel
  }
  const tel2Raw = clean(raw.telefono2)
  if (tel2Raw) {
    const tel2 = normalizePhone(tel2Raw)
    if (tel2.length === 10) datos.telefono2 = tel2
  }

  if (clean(raw.especialidad)) datos.especialidad = clean(raw.especialidad)
  if (clean(raw.ciudad)) datos.ciudad = clean(raw.ciudad)
  if (clean(raw.consultorio_direccion)) datos.consultorio_direccion = clean(raw.consultorio_direccion)
  if (clean(raw.consultorio_estado)) datos.consultorio_estado = clean(raw.consultorio_estado)
  if (clean(raw.colonia)) datos.colonia = clean(raw.colonia)
  const cp = clean(raw.codigo_postal).replace(/\D/g, '')
  if (cp && cp.length === 5) datos.codigo_postal = cp
  if (clean(raw.hospital_consultorio)) datos.hospital_consultorio = clean(raw.hospital_consultorio)
  if (clean(raw.rfc)) datos.rfc = clean(raw.rfc).toUpperCase()
  const curp = clean(raw.curp).toUpperCase()
  if (curp) {
    if (!CURP_RE.test(curp)) errores.push(`CURP inválida: ${curp}`)
    else datos.curp = curp
  }
  if (clean(raw.usuario)) datos.usuario = clean(raw.usuario)
  if (clean(raw.password)) datos.password = clean(raw.password)
  if (clean(raw.universidad)) datos.universidad = clean(raw.universidad)
  if (clean(raw.tipo_consulta)) datos.tipo_consulta = clean(raw.tipo_consulta)
  if (clean(raw.bio)) datos.bio = clean(raw.bio)
  if (clean(raw.subespecialidad)) datos.subespecialidad = clean(raw.subespecialidad)

  const comision = clean(raw.comision_por_cita)
  if (comision) { const n = parseNum(comision); if (n !== null) datos.comision_por_cita = n }
  const nivel = clean(raw.comision_tipo)
  if (nivel) { const n = parseNum(nivel); if (n !== null) datos.comision_tipo = n }
  const precio = clean(raw.precio_regular)
  if (precio) { const n = parseNum(precio); if (n !== null) datos.precio_regular = n }
  const precioM = clean(raw.precio_miembro)
  if (precioM) { const n = parseNum(precioM); if (n !== null) datos.precio_miembro = n }

  const convenio = parseBool(raw.convenio_firmado)
  if (convenio !== undefined) datos.convenio_firmado = convenio

  const ffc = parseDateValue(raw.fecha_firma_convenio)
  if (ffc) datos.fecha_firma_convenio = ffc
  const fa = parseDateValue(raw.fecha_afiliacion)
  if (fa) datos.fecha_afiliacion = fa

  const adv = clean(raw.advertencias)
  if (adv) { const n = parseNum(adv); if (n !== null) datos.advertencias = n }

  let notas = clean(raw.notas)
  if (notas && SELECTOR_RE.test(notas)) notas = ''
  if (notas) datos.notas = notas

  return { datos, errores }
}

// ---------- Análisis + importación ----------

export interface RunImportOptions {
  dryRun?: boolean
  actualizar?: boolean
  enviarConfirmacion?: boolean
  usuarioId?: string | null
  archivo?: string | null
}

export async function runImport(pool: any, rows: string[][], opts: RunImportOptions = {}): Promise<ImportResult> {
  const { dryRun = false, actualizar = false, enviarConfirmacion = false } = opts

  const headerRow = rows[0] || []
  const dataRows = rows.slice(1)
  const map = mapColumns(headerRow)

  const result: ImportResult = {
    total: dataRows.length,
    insertados: 0,
    actualizados: 0,
    duplicados: 0,
    errores: 0,
    columnas: map.columnas,
    columnasNoReconocidas: map.columnasNoReconocidas,
    filas: [],
  }

  // 1. Construir registros + validación por fila
  const parsed: { fila: number; datos: Record<string, any>; errores: string[] }[] = []
  dataRows.forEach((row, i) => {
    const fila = i + 2 // fila en el archivo (1 = encabezado)
    if (!row || row.every(c => clean(c) === '')) return
    const { datos, errores } = buildRecord(row, map)
    // Ignorar filas sin datos de identidad (p. ej. IDs preasignados con fórmulas vacías)
    const tieneIdentidad = datos.nombre || datos.apellido_paterno || datos.apellido_materno ||
      datos.email || datos.cedula_profesional || datos.telefono
    if (!tieneIdentidad) return
    parsed.push({ fila, datos, errores })
  })

  // 2. Detección de duplicados en la BD
  const emails = parsed.map(p => p.datos.email).filter(Boolean)
  const cedulas = parsed.map(p => p.datos.cedula_profesional).filter(Boolean)
  const telefonos = parsed.map(p => p.datos.telefono).filter(Boolean)

  const byEmail = new Map<string, any>()
  const byCedula = new Map<string, any>()
  const byTelefono = new Map<string, any>()

  if (emails.length || cedulas.length || telefonos.length) {
    const dbRes = await pool.query(
      `SELECT id, nombre, apellido, slug, email, cedula_profesional, telefono
       FROM medicos
       WHERE (email = ANY($1::text[])) OR (cedula_profesional = ANY($2::text[])) OR (telefono = ANY($3::text[]))`,
      [emails, cedulas, telefonos]
    )
    for (const r of dbRes.rows) {
      if (r.email) byEmail.set(String(r.email).toLowerCase(), r)
      if (r.cedula_profesional) byCedula.set(String(r.cedula_profesional), r)
      if (r.telefono) byTelefono.set(normalizePhone(r.telefono), r)
    }
  }

  // 3. Duplicados dentro del archivo
  const seenEmail = new Set<string>()
  const seenCedula = new Set<string>()

  const rowResults: ImportRowResult[] = []

  for (const p of parsed) {
    const d = p.datos
    const base: ImportRowResult = {
      fila: p.fila,
      status: 'nuevo',
      nombre: [d.nombre, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' '),
      email: d.email,
      cedula: d.cedula_profesional,
      telefono: d.telefono,
      datos: d,
    }

    if (p.errores.length > 0) {
      rowResults.push({ ...base, status: 'error', mensaje: p.errores.join('. ') })
      continue
    }

    // Duplicado dentro del archivo
    if (d.email && seenEmail.has(d.email)) {
      rowResults.push({ ...base, status: 'duplicado', mensaje: 'Correo repetido dentro del archivo' })
      continue
    }
    if (d.cedula_profesional && seenCedula.has(d.cedula_profesional)) {
      rowResults.push({ ...base, status: 'duplicado', mensaje: 'Cédula repetida dentro del archivo' })
      continue
    }
    if (d.email) seenEmail.add(d.email)
    if (d.cedula_profesional) seenCedula.add(d.cedula_profesional)

    // Existente en BD
    const existente =
      (d.email && byEmail.get(d.email)) ||
      (d.cedula_profesional && byCedula.get(d.cedula_profesional)) ||
      null

    if (existente) {
      if (actualizar) {
        rowResults.push({ ...base, status: 'actualizar', mensaje: `Actualizará a ${existente.nombre} ${existente.apellido}`, datos: { ...d, _id: existente.id } })
      } else {
        rowResults.push({ ...base, status: 'duplicado', mensaje: `Ya registrado: ${existente.nombre} ${existente.apellido}` })
      }
    } else {
      rowResults.push({ ...base, status: 'nuevo' })
    }
  }

  // 4. Ejecutar si no es dry-run
  if (!dryRun) {
    for (const r of rowResults) {
      if (r.status === 'nuevo') {
        try {
          await createMedico(pool, r.datos as any, { enviarConfirmacion, emitirEvento: true })
          r.status = 'insertado'
          r.mensaje = 'Médico creado'
          result.insertados++
        } catch (e: any) {
          r.status = 'error'
          r.mensaje = e instanceof MedicoInputError ? e.message : (e?.message || 'Error al crear')
          result.errores++
        }
      } else if (r.status === 'actualizar') {
        try {
          await updateMedicoFromImport(pool, (r.datos as any)._id, r.datos)
          r.status = 'actualizado'
          r.mensaje = 'Médico actualizado'
          result.actualizados++
        } catch (e: any) {
          r.status = 'error'
          r.mensaje = e?.message || 'Error al actualizar'
          result.errores++
        }
      } else if (r.status === 'duplicado') {
        result.duplicados++
      } else if (r.status === 'error') {
        result.errores++
      }
    }

    // Bitácora
    try {
      await pool.query(
        `INSERT INTO medicos_import_batches (usuario_id, archivo, total, insertados, actualizados, errores, detalle)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          opts.usuarioId || null,
          (opts.archivo || '').slice(0, 255) || null,
          result.total,
          result.insertados,
          result.actualizados,
          result.errores,
          JSON.stringify({ columnas: result.columnas, noReconocidas: result.columnasNoReconocidas })
        ]
      )
    } catch (e: any) {
      console.error('[Import Medicos] No se pudo registrar la bitácora:', e?.message)
    }
  }

  result.filas = rowResults

  // Recalcular resumen en dry-run (errores/duplicados ya calculados arriba; insertados/actualizados no)
  if (dryRun) {
    result.errores = rowResults.filter(r => r.status === 'error').length
    result.duplicados = rowResults.filter(r => r.status === 'duplicado').length
  }

  return result
}

async function updateMedicoFromImport(pool: any, id: string, datos: Record<string, any>) {
  const sets: string[] = []
  const params: any[] = []
  let idx = 1

  const simple: [string, any][] = [
    ['nombre', datos.nombre],
    ['apellido', datos.apellido_paterno || datos.apellido_materno],
    ['apellido_paterno', datos.apellido_paterno],
    ['apellido_materno', datos.apellido_materno],
    ['titulo', datos.titulo],
    ['telefono', datos.telefono],
    ['cedula_profesional', datos.cedula_profesional],
    ['email', datos.email],
    ['rfc', datos.rfc],
    ['curp', datos.curp],
    ['codigo_postal', datos.codigo_postal],
    ['colonia', datos.colonia],
    ['consultorio_ciudad', datos.ciudad],
    ['consultorio_estado', datos.consultorio_estado],
    ['consultorio_direccion', datos.consultorio_direccion],
    ['hospital_consultorio', datos.hospital_consultorio],
    ['tipo_consulta', datos.tipo_consulta],
    ['notas', datos.notas],
    ['comision_tipo', datos.comision_tipo],
    ['comision_por_cita', datos.comision_por_cita],
    ['fecha_firma_convenio', datos.fecha_firma_convenio],
    ['fecha_afiliacion', datos.fecha_afiliacion],
  ]
  for (const [col, val] of simple) {
    if (val !== undefined && val !== null && val !== '') {
      sets.push(`${col} = $${idx++}`)
      params.push(val)
    }
  }
  if (datos.convenio_firmado !== undefined) {
    sets.push(`convenio_firmado = $${idx++}`)
    params.push(datos.convenio_firmado)
  }
  if (datos.advertencias !== undefined) {
    sets.push(`advertencias = $${idx++}`)
    params.push(datos.advertencias)
  }

  // Especialidad (upsert)
  if (datos.especialidad) {
    const espResult = await pool.query('SELECT id FROM especialidades WHERE LOWER(nombre) = LOWER($1) LIMIT 1', [datos.especialidad])
    let idEsp = espResult.rows[0]?.id
    if (!idEsp) {
      const newEsp = await pool.query('INSERT INTO especialidades (nombre) VALUES ($1) RETURNING id', [datos.especialidad])
      idEsp = newEsp.rows[0].id
    }
    sets.push(`id_especialidad = $${idx++}`)
    params.push(idEsp)
  }

  if (sets.length === 0) return
  sets.push(`updated_at = NOW()`)
  params.push(id)
  await pool.query(`UPDATE medicos SET ${sets.join(', ')} WHERE id = $${idx}`, params)
}
