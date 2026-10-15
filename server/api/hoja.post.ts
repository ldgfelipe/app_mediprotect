/**
 * POST /api/hoja
 * body = { recurso, action: 'update' | 'bulk' | 'create' | 'delete', ... }
 *
 * Mutaciones seguras para la vista tipo Excel:
 *  - 'update': cambia solo las celdas indicadas (nunca borra el resto).
 *  - 'bulk'  : aplica muchos cambios (pegar un bloque de Excel).
 *  - 'create': agrega una fila (médicos reutiliza createMedico).
 *  - 'delete': elimina una fila.
 */
import bcrypt from 'bcryptjs'
import { getRecurso, resolverColumnas, columnasExistentes, type HojaColumna } from '../utils/hoja-recursos.js'
import { coercionarCambios, CeldaError } from '../utils/hoja-valores.js'
import { createMedico, MedicoInputError } from '../utils/create-medico.js'

function editablesDe(columnas: HojaColumna[]): HojaColumna[] {
  return columnas.filter(c => !c.virtual && c.editable !== false)
}

async function aplicarUpdate(pool: any, recurso: any, editables: HojaColumna[], id: any, cambios: Record<string, any>, existentes: Set<string>) {
  const aplicables = editables.filter(c => c.key in (cambios || {}))
  if (!aplicables.length) return { sinCambios: true }

  // Requeridos no pueden quedar vacíos
  for (const c of aplicables) {
    if (c.required) {
      const v = cambios[c.key]
      if (v === null || v === undefined || String(v).trim() === '') {
        throw new CeldaError(c.key, `"${c.label}" es obligatorio`)
      }
    }
  }

  const { cols, valores } = coercionarCambios(aplicables, cambios)
  if (!cols.length) return { sinCambios: true }

  const sets = cols.map((c, i) => `${c} = $${i + 1}`)
  if (existentes.has('updated_at')) sets.push('updated_at = NOW()')
  const params = [...valores, id]

  await pool.query(
    `UPDATE ${recurso.table} SET ${sets.join(', ')} WHERE ${recurso.idColumn} = $${params.length}`,
    params
  )
  return { actualizado: true, campos: cols }
}

async function crearFila(pool: any, recurso: any, editables: HojaColumna[], cambios: Record<string, any>, existentes: Set<string>) {
  // Solo columnas presentes en el payload
  const presentes: Record<string, any> = {}
  for (const c of editables) {
    if (c.key in cambios) presentes[c.key] = cambios[c.key]
  }

  for (const c of editables) {
    if (c.required) {
      const v = presentes[c.key]
      if (v === null || v === undefined || String(v).trim() === '') {
        throw new CeldaError(c.key, `"${c.label}" es obligatorio`)
      }
    }
  }

  const { cols, valores } = coercionarCambios(editables.filter(c => c.key in presentes), presentes)

  // Médicos: reutiliza la lógica del alta (slug, especialidad, validaciones)
  if (recurso.key === 'medicos') {
    const datos: Record<string, any> = {}
    cols.forEach((c, i) => { datos[c] = valores[i] })

    const { medico } = await createMedico(pool, datos, { enviarConfirmacion: false, emitirEvento: true })
    const { password_hash: _ph, ...medicoSeguro } = medico as any

    // createMedico no maneja precios/activo: los aplicamos con un UPDATE para
    // que la fila quede exactamente como la capturó el usuario.
    const r = coercionarCambios(editables, datos)
    if (r.cols.length) {
      const sets = r.cols.map((c, i) => `${c} = $${i + 1}`)
      await pool.query(
        `UPDATE medicos SET ${sets.join(', ')} WHERE id = $${r.valores.length + 1}`,
        [...r.valores, medico.id]
      )
    }
    return { ...medicoSeguro, ...datos }
  }

  // Pacientes / Empresas: INSERT directo
  const columnasInsert = [...cols]
  const valoresInsert = [...valores]

  if (recurso.key === 'pacientes' && !columnasInsert.includes('password_hash')) {
    columnasInsert.push('password_hash')
    valoresInsert.push(await bcrypt.hash('mediprotect123', 10))
  }

  const placeholders = columnasInsert.map((_, i) => `$${i + 1}`)
  const result = await pool.query(
    `INSERT INTO ${recurso.table} (${columnasInsert.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    valoresInsert
  )
  const fila = result.rows[0]
  if (fila) delete fila.password_hash
  return fila
}

export default defineEventHandler(async (event) => {
  verifyAdminOrAsistenteToken(event)
  const pool = await useDbPool(event)
  const body = await readBody(event)

  const recurso = getRecurso(body?.recurso)
  if (!recurso) throw createError({ statusCode: 404, message: 'Recurso no encontrado' })

  const columnas = await resolverColumnas(pool, recurso)
  const editables = editablesDe(columnas)
  const existentes = await columnasExistentes(pool, recurso.table)

  const action = body?.action || 'update'

  try {
    if (!recurso.editable) {
      throw createError({ statusCode: 400, message: `La hoja "${recurso.label}" es solo de consulta` })
    }

    if (action === 'update') {
      const r = await aplicarUpdate(pool, recurso, editables, body.id, body.cambios || {}, existentes)
      return { ok: true, ...r }
    }

    if (action === 'bulk') {
      const filas = Array.isArray(body.rows) ? body.rows : []
      let actualizados = 0
      const errores: any[] = []
      for (const fila of filas) {
        try {
          const r = await aplicarUpdate(pool, recurso, editables, fila.id, fila.cambios || {}, existentes)
          if (!r.sinCambios) actualizados++
        } catch (e: any) {
          errores.push({ id: fila.id, mensaje: e?.message || 'Error' })
        }
      }
      return { ok: true, actualizados, errores }
    }

    if (action === 'create') {
      const fila = await crearFila(pool, recurso, editables, body.cambios || {}, existentes)
      return { ok: true, fila }
    }

    if (action === 'delete') {
      await pool.query(
        `DELETE FROM ${recurso.table} WHERE ${recurso.idColumn} = $1`,
        [body.id]
      )
      return { ok: true }
    }

    throw createError({ statusCode: 400, message: `Acción no soportada: ${action}` })
  } catch (err: any) {
    if (err?.statusCode) throw err
    if (err instanceof CeldaError) {
      throw createError({ statusCode: 400, message: err.message })
    }
    if (err instanceof MedicoInputError) {
      throw createError({ statusCode: err.statusCode, message: err.message })
    }
    if (err?.code === '23505') {
      throw createError({ statusCode: 400, message: 'Ese valor ya existe (correo, cédula o usuario duplicado)' })
    }
    if (err?.code === '23503') {
      throw createError({ statusCode: 400, message: 'No se puede eliminar: tiene registros relacionados' })
    }
    if (err?.code === '23502') {
      throw createError({ statusCode: 400, message: 'Falta un dato obligatorio' })
    }
    throw createError({ statusCode: 500, message: err?.message || 'Error al guardar' })
  }
})
