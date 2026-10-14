/**
 * Verifica si un médico ya existe por correo, cédula o teléfono.
 * Devuelve coincidencias legibles ("Ya registrado: ...") para avisar en el
 * formulario ANTES de guardar (técnica del CRM: detección de duplicados).
 */

function limpiaCedula(v: any): string {
  return String(v || '').replace(/[^0-9A-Za-z]/g, '')
}
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
  const cedula = limpiaCedula(body?.cedula_profesional)
  const telefono = limpiaTel(body?.telefono)
  const excluirId = body?.excluir_id || null

  const duplicados: any[] = []

  if (!email && !cedula && !telefono) {
    return { existe: false, duplicados }
  }

  const conds: string[] = []
  const params: any[] = []
  let i = 1

  if (email) { conds.push(`LOWER(email) = $${i++}`); params.push(email) }
  if (cedula) { conds.push(`regexp_replace(COALESCE(cedula_profesional, ''), '[^0-9A-Za-z]', '', 'g') = $${i++}`); params.push(cedula) }
  if (telefono) { conds.push(`regexp_replace(COALESCE(telefono, ''), '[^0-9]', '', 'g') = $${i++}`); params.push(telefono) }

  let sql = `SELECT id, nombre, apellido, email, cedula_profesional, telefono, slug
             FROM medicos WHERE (${conds.join(' OR ')})`
  if (excluirId) { sql += ` AND id <> $${i++}`; params.push(excluirId) }
  sql += ' LIMIT 5'

  try {
    const r = await pool.query(sql, params)
    for (const m of r.rows) {
      if (email && String(m.email || '').toLowerCase() === email) {
        duplicados.push({ campo: 'email', valor: email, id: m.id, nombre: `${m.nombre || ''} ${m.apellido || ''}`.trim(), mensaje: `Ya registrado: ${[m.nombre, m.apellido].filter(Boolean).join(' ')}` })
      }
      if (cedula && limpiaCedula(m.cedula_profesional) === cedula) {
        duplicados.push({ campo: 'cedula_profesional', valor: cedula, id: m.id, nombre: `${m.nombre || ''} ${m.apellido || ''}`.trim(), mensaje: `Cédula ya registrada: ${[m.nombre, m.apellido].filter(Boolean).join(' ')}` })
      }
      if (telefono && limpiaTel(m.telefono) === telefono) {
        duplicados.push({ campo: 'telefono', valor: telefono, id: m.id, nombre: `${m.nombre || ''} ${m.apellido || ''}`.trim(), mensaje: `Teléfono ya registrado: ${[m.nombre, m.apellido].filter(Boolean).join(' ')}` })
      }
    }
  } catch (e: any) {
    console.error('[medicos/check]', e?.message)
  }

  return { existe: duplicados.length > 0, duplicados }
})
