/**
 * Registro de "hojas" para la vista tipo Excel.
 *
 * Cada recurso declara:
 *  - la tabla base y su alias,
 *  - el FROM (con joins cuando se requieren nombres legibles),
 *  - sus columnas, con tipo, etiqueta, si son editables y si son virtuales
 *    (calculadas por un join, por lo que no se pueden escribir).
 *
 * Las columnas NO virtuales solo se exponen si existen realmente en la tabla
 * (se consulta information_schema), de modo que la hoja nunca se rompe si
 * falta una migración.
 */

export type HojaTipo =
  | 'text' | 'textarea' | 'number' | 'boolean'
  | 'email' | 'phone' | 'curp' | 'date' | 'datetime' | 'select'

export interface HojaColumna {
  key: string
  label: string
  type: HojaTipo
  expr?: string        // expresión SQL; por defecto `<alias>.<key>`
  editable?: boolean   // por defecto true (si la hoja es editable)
  virtual?: boolean    // proviene de un join: nunca es editable
  required?: boolean
  search?: boolean
  width?: number
  options?: string[]
}

export interface HojaRecurso {
  key: string
  label: string
  icono: string
  table: string
  baseAlias: string
  idColumn: string
  from: string
  editable: boolean
  orden: string
  columnas: HojaColumna[]
}

const RECURSOS: HojaRecurso[] = [
  {
    key: 'medicos',
    label: 'Médicos',
    icono: '🧑‍⚕️',
    table: 'medicos',
    baseAlias: 'm',
    idColumn: 'id',
    from: 'medicos m LEFT JOIN especialidades e ON e.id = m.id_especialidad',
    editable: true,
    orden: 'm.created_at DESC',
    columnas: [
      { key: 'titulo', label: 'Título', type: 'select', options: ['Dr.', 'Dra.', 'Lic.', 'Enf.', 'L.N.'] },
      { key: 'nombre', label: 'Nombre', type: 'text', required: true, search: true },
      { key: 'apellido_paterno', label: 'Apellido paterno', type: 'text', required: true, search: true },
      { key: 'apellido_materno', label: 'Apellido materno', type: 'text', search: true },
      { key: 'email', label: 'Correo', type: 'email', search: true },
      { key: 'telefono', label: 'Teléfono', type: 'phone', search: true },
      { key: 'cedula_profesional', label: 'Cédula', type: 'text', search: true },
      { key: 'especialidad', label: 'Especialidad', type: 'text', expr: 'e.nombre', virtual: true, search: true },
      { key: 'consultorio_ciudad', label: 'Ciudad', type: 'text' },
      { key: 'hospital_consultorio', label: 'Hospital / Consultorio', type: 'text' },
      { key: 'precio_regular', label: 'Precio regular', type: 'number' },
      { key: 'precio_miembro', label: 'Precio miembro', type: 'number' },
      { key: 'comision_por_cita', label: 'Comisión por cita', type: 'number' },
      { key: 'convenio_firmado', label: 'Convenio firmado', type: 'boolean' },
      { key: 'fecha_afiliacion', label: 'Fecha afiliación', type: 'date' },
      { key: 'notas', label: 'Notas', type: 'textarea' },
      { key: 'activo', label: 'Activo', type: 'boolean' },
      { key: 'created_at', label: 'Registrado', type: 'datetime', editable: false },
    ],
  },
  {
    key: 'pacientes',
    label: 'Pacientes',
    icono: '🧑',
    table: 'pacientes',
    baseAlias: 'p',
    idColumn: 'id',
    from: 'pacientes p',
    editable: true,
    orden: 'p.created_at DESC',
    columnas: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true, search: true },
      { key: 'apellido', label: 'Apellido', type: 'text', search: true },
      { key: 'email', label: 'Correo', type: 'email', required: true, search: true },
      { key: 'telefono', label: 'Teléfono', type: 'phone', search: true },
      { key: 'curp', label: 'CURP', type: 'curp', search: true },
      { key: 'fecha_nacimiento', label: 'Nacimiento', type: 'date' },
      { key: 'genero', label: 'Género', type: 'select', options: ['masculino', 'femenino', 'otro'] },
      { key: 'ciudad', label: 'Ciudad', type: 'text' },
      { key: 'colonia', label: 'Colonia', type: 'text' },
      { key: 'codigo_postal', label: 'C.P.', type: 'text' },
      { key: 'plan_contratado', label: 'Plan', type: 'text' },
      { key: 'activo', label: 'Activo', type: 'boolean' },
      { key: 'created_at', label: 'Registrado', type: 'datetime', editable: false },
    ],
  },
  {
    key: 'empresas',
    label: 'Empresas',
    icono: '🏢',
    table: 'empresas',
    baseAlias: 'g',
    idColumn: 'id',
    from: 'empresas g',
    editable: true,
    orden: 'g.created_at DESC',
    columnas: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true, search: true },
      { key: 'rfc', label: 'RFC', type: 'text', search: true },
      { key: 'email', label: 'Correo', type: 'email', required: true, search: true },
      { key: 'telefono', label: 'Teléfono', type: 'phone' },
      { key: 'contacto_nombre', label: 'Contacto', type: 'text', search: true },
      { key: 'direccion', label: 'Dirección', type: 'text' },
      { key: 'ciudad', label: 'Ciudad', type: 'text' },
      { key: 'estado', label: 'Estado', type: 'text' },
      { key: 'activo', label: 'Activo', type: 'boolean' },
      { key: 'created_at', label: 'Registrado', type: 'datetime', editable: false },
    ],
  },
  {
    key: 'citas',
    label: 'Citas',
    icono: '📅',
    table: 'citas',
    baseAlias: 'c',
    idColumn: 'id',
    from: 'citas c LEFT JOIN pacientes p ON c.id_paciente = p.id LEFT JOIN medicos m ON c.id_medico = m.id',
    editable: false,
    orden: 'c.fecha_hora DESC NULLS LAST',
    columnas: [
      { key: 'fecha_hora', label: 'Fecha y hora', type: 'datetime', expr: 'c.fecha_hora', virtual: true },
      { key: 'estado', label: 'Estado', type: 'text', expr: 'c.estado', virtual: true, search: true },
      { key: 'paciente_nombre', label: 'Paciente', type: 'text', expr: "COALESCE(c.whatsapp_nombre, CONCAT_WS(' ', p.nombre, p.apellido))", virtual: true, search: true },
      { key: 'paciente_telefono', label: 'Teléfono', type: 'text', expr: 'COALESCE(p.telefono, c.whatsapp_telefono)', virtual: true },
      { key: 'medico_nombre', label: 'Médico', type: 'text', expr: "COALESCE(c.whatsapp_medico_nombre, CONCAT_WS(' ', m.nombre, m.apellido))", virtual: true, search: true },
      { key: 'costo_consulta', label: 'Costo', type: 'number', expr: 'c.costo_consulta', virtual: true },
      { key: 'notas_paciente', label: 'Notas', type: 'text', expr: 'c.notas_paciente', virtual: true },
      { key: 'created_at', label: 'Creada', type: 'datetime', expr: 'c.created_at', virtual: true },
    ],
  },
  {
    key: 'pagos',
    label: 'Pagos',
    icono: '💳',
    table: 'pagos',
    baseAlias: 'g',
    idColumn: 'id',
    from: 'pagos g LEFT JOIN pacientes p ON g.id_paciente = p.id',
    editable: false,
    orden: 'g.created_at DESC',
    columnas: [
      { key: 'created_at', label: 'Fecha', type: 'datetime', expr: 'g.created_at', virtual: true },
      { key: 'paciente_nombre', label: 'Paciente', type: 'text', expr: "CONCAT_WS(' ', p.nombre, p.apellido)", virtual: true, search: true },
      { key: 'monto', label: 'Monto', type: 'number', expr: 'g.monto', virtual: true },
      { key: 'moneda', label: 'Moneda', type: 'text', expr: 'g.moneda', virtual: true },
      { key: 'metodo_pago', label: 'Método', type: 'text', expr: 'g.metodo_pago', virtual: true },
      { key: 'estado', label: 'Estado', type: 'text', expr: 'g.estado', virtual: true, search: true },
      { key: 'estatus', label: 'Estatus', type: 'text', expr: 'g.estatus', virtual: true, search: true },
      { key: 'descripcion', label: 'Descripción', type: 'text', expr: 'g.descripcion', virtual: true },
    ],
  },
]

export function getRecurso(key: string | undefined | null): HojaRecurso | null {
  if (!key) return null
  return RECURSOS.find(r => r.key === key) || null
}

export function listarRecursos(): Array<Pick<HojaRecurso, 'key' | 'label' | 'icono' | 'editable'>> {
  return RECURSOS.map(r => ({ key: r.key, label: r.label, icono: r.icono, editable: r.editable }))
}

export function exprDe(recurso: HojaRecurso, col: HojaColumna): string {
  return col.expr || `${recurso.baseAlias}.${col.key}`
}

export function esEditable(recurso: HojaRecurso, col: HojaColumna): boolean {
  return recurso.editable && !col.virtual && col.editable !== false
}

/** Columnas realmente existentes en la tabla base. */
export async function columnasExistentes(pool: any, table: string): Promise<Set<string>> {
  try {
    const r = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = current_schema()`,
      [table]
    )
    return new Set((r.rows || []).map((x: any) => x.column_name))
  } catch {
    return new Set()
  }
}

/** Filtra las columnas del recurso a las que existen (o son virtuales). */
export async function resolverColumnas(pool: any, recurso: HojaRecurso): Promise<HojaColumna[]> {
  const existentes = await columnasExistentes(pool, recurso.table)
  if (existentes.size === 0) return recurso.columnas
  return recurso.columnas.filter(c => c.virtual || existentes.has(c.key))
}
