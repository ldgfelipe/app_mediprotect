/**
 * Verifica si un paciente ya existe por correo, teléfono o CURP.
 * Devuelve coincidencias legibles para avisar en el formulario antes de guardar.
 */

function limpiaTel(v: any): string {
  let s = String(v || '').replace(/\D/g, '')
  if (s.length === 13 && s.startsWith('521')) s = s.slice(3)
  else if (s.length === 12 && s.startsWith('52')) s = s.slice(2)
  return s
}

export default defineEventHandler(async (event) => {
  verifyAdminOrAsistenteToken(event)
  const pool = await useDbPool(event)
  const body = await readBody(event)

  const email = String(body?.email || '').trim().toLowerCase()
  const telefono = limpiaTel(body?.telefono)
  const curp = String(body?.curp || '').trim().toUpperCase()
  const excluirId = body?.excluir_id || null

  const duplicados: any[] = []
  if (!email && !telefono && !curp) return { existe: false, duplicados }

  const conds: string[] = []
  const params: any[] = []
  let i = 1
  if (email) { conds.push(`LOWER(email) = $${i++}`); params.push(email) }
  if (telefono) { conds.push(`regexp_replace(COALESCE(telefono, ''), '[^0-9]', '', 'g') = $${i++}`); params.push(telefono) }
  if (curp) { conds.push(`UPPER(COALESCE(curp, '')) = $${i++}`); params.push(curp) }

  let sql = `SELECT id, nombre, apellido, email, telefono, curp FROM pacientes WHERE (${conds.join(' OR ')})`
  if (excluirId) { sql += ` AND id <> $${i++}`; params.push(excluirId) }
  sql += ' LIMIT 5'

  try {
    const r = await pool.query(sql, params)
    for (const p of r.rows) {
      const nombre = `${p.nombre || ''} ${p.apellido || ''}`.trim()
      if (email && String(p.email || '').toLowerCase() === email) {
        duplicados.push({ campo: 'email', valor: email, id: p.id, mensaje: `Ya registrado: ${nombre}` })
      }
      if (telefono && limpiaTel(p.telefono) === telefono) {
        duplicados.push({ campo: 'telefono', valor: telefono, id: p.id, mensaje: `Teléfono ya registrado: ${nombre}` })
      }
      if (curp && String(p.curp || '').toUpperCase() === curp) {
        duplicados.push({ campo: 'curp', valor: curp, id: p.id, mensaje: `CURP ya registrada: ${nombre}` })
      }
    }
  } catch (e: any) {
    console.error('[pacientes/check]', e?.message)
  }

  return { existe: duplicados.length > 0, duplicados }
})
