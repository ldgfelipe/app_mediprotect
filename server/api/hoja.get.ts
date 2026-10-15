/**
 * GET /api/hoja?recurso=medicos&q=&sort=&dir=&limit=&offset=
 *
 * Devuelve las columnas y filas de una "hoja" (vista tipo Excel) para admin
 * o asistente. Solo expone columnas que existen realmente en la base.
 */
import { getRecurso, listarRecursos, exprDe, resolverColumnas, type HojaColumna } from '../utils/hoja-recursos.js'

function exprimirColumna(recurso: any, col: HojaColumna): string {
  return exprDe(recurso, col)
}

function resolverOrden(recurso: any, columnas: HojaColumna[], sort: any, dir: any): string {
  const direccion = String(dir || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC'
  if (sort) {
    const col = columnas.find(c => c.key === String(sort))
    if (col) return `${exprimirColumna(recurso, col)} ${direccion} NULLS LAST`
  }
  return recurso.orden
}

export default defineEventHandler(async (event) => {
  verifyAdminOrAsistenteToken(event)
  const pool = await useDbPool(event)
  const q = getQuery(event)

  const recurso = getRecurso(String(q.recurso || 'medicos'))
  if (!recurso) {
    return { error: 'Recurso no encontrado', recursos: listarRecursos() }
  }

  const columnas = await resolverColumnas(pool, recurso)
  const params: any[] = []
  const where: string[] = []

  const buscado = String(q.q || '').trim().toLowerCase()
  if (buscado) {
    const buscables = columnas.filter((c: HojaColumna) => c.search)
    if (buscables.length) {
      params.push(`%${buscado}%`)
      const i = params.length
      const ors = buscables.map((c: HojaColumna) => `LOWER(COALESCE(${exprimirColumna(recurso, c)}::text, '')) LIKE $${i}`)
      where.push(`(${ors.join(' OR ')})`)
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const totalRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM ${recurso.from} ${whereSql}`,
    params
  )
  const total = totalRes.rows[0]?.total || 0

  const limit = Math.min(Math.max(parseInt(String(q.limit || '200')) || 200, 1), 1000)
  const offset = Math.max(parseInt(String(q.offset || '0')) || 0, 0)

  const orden = resolverOrden(recurso, columnas, q.sort, q.dir)

  const selectList = [
    `${recurso.baseAlias}.${recurso.idColumn} AS id`,
    ...columnas.map((c: HojaColumna) => `${exprimirColumna(recurso, c)} AS "${c.key}"`),
  ].join(', ')

  const paramsConsulta = [...params, limit, offset]
  const filasRes = await pool.query(
    `SELECT ${selectList} FROM ${recurso.from} ${whereSql} ORDER BY ${orden} LIMIT $${paramsConsulta.length - 1} OFFSET $${paramsConsulta.length}`,
    paramsConsulta
  )

  return {
    recurso: recurso.key,
    label: recurso.label,
    icono: recurso.icono,
    editable: recurso.editable,
    columnas: columnas.map((c: HojaColumna) => ({
      key: c.key,
      label: c.label,
      type: c.type,
      editable: recurso.editable && !c.virtual && c.editable !== false,
      virtual: !!c.virtual,
      required: !!c.required,
      width: c.width || null,
      options: c.options || null,
    })),
    filas: filasRes.rows,
    total,
    limit,
    offset,
    recursos: listarRecursos(),
  }
})
