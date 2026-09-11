
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const body = await readBody(event)
  const { curp, genero, estado_civil, id_empresa } = body

  if (!curp && !genero && !estado_civil) {
    throw createError({ statusCode: 400, message: 'Al menos uno de los campos es requerido: curp, genero, estado_civil' })
  }

  const pool = useDbPool(event)

  // Obtener todos los pacientes
  const allPatients = await pool.query('SELECT id FROM pacientes ORDER BY created_at')

  const updated = []
  const errors = []

  for (const patient of allPatients.rows) {
    const patientId = patient.id
    const sets = []
    const params = []
    let idx = 1

    if (curp !== undefined) {
      const curpUpper = (curp || '').toUpperCase().trim()
      if (curpUpper && !/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curpUpper)) {
        errors.push(`Paciente ${patientId}: CURP formateo invalido`)
        continue
      }
      sets.push(`curp = $${idx++}`)
      params.push(curpUpper || null)
    }
    if (genero !== undefined) {
      sets.push(`genero = $${idx++}`)
      params.push(genero || null)
    }
    if (estado_civil !== undefined) {
      sets.push(`estado_civil = $${idx++}`)
      params.push(estado_civil || null)
    }

    if (sets.length > 0 && id_empresa !== undefined) {
      // Agregar a empresa
      const existing = await pool.query(
        'SELECT id FROM empresa_pacientes WHERE id_empresa = $1 AND id_paciente = $2',
        [id_empresa, patientId]
      )
      if (existing.rows.length === 0) {
        await pool.query(
          'INSERT INTO empresa_pacientes (id_empresa, id_paciente) VALUES ($1, $2)',
          [id_empresa, patientId]
        )
      }
    } else if (sets.length > 0 && id_empresa !== undefined) {
      // Si solo se actualizan campos pero no hay id_empresa, se omite la asociacion
    }

    if (sets.length > 0) {
      params.push(patientId)
      const result = await pool.query(
        `UPDATE pacientes SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, nombre, curp, genero, estado_civil`,
        params
      )
      if (result.rows.length > 0) {
        updated.push(result.rows[0])
      }
    }
  }

  return {
    success: true,
    totalPatients: allPatients.rows.length,
    updated: updated.length,
    message: updated.length > 0 ? `Actualizados ${updated.length} de ${allPatients.rows.length} pacientes` : 'No se pudieron actualizar pacientes',
    errors: errors.length > 0 ? errors : undefined,
  }
})