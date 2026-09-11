
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { id_paciente } = body

  if (!id_paciente) throw createError({ statusCode: 400, message: 'id_paciente es requerido' })

  const pool = await useDbPool(event)

  const existing = await pool.query(
    'SELECT id FROM empresa_pacientes WHERE id_empresa = $1 AND id_paciente = $2',
    [id, id_paciente]
  )

  if (existing.rows.length > 0) {
    await pool.query(
      'UPDATE empresa_pacientes SET activo = true WHERE id_empresa = $1 AND id_paciente = $2',
      [id, id_paciente]
    )
  } else {
    await pool.query(
      'INSERT INTO empresa_pacientes (id_empresa, id_paciente) VALUES ($1, $2)',
      [id, id_paciente]
    )
  }

  return { ok: true }
})
