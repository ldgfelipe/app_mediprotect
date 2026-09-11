
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const id = getRouterParam(event, 'id')
  const pacienteId = getRouterParam(event, 'pacienteId')

  const pool = useDbPool(event)

  await pool.query(
    'UPDATE empresa_pacientes SET activo = false WHERE id_empresa = $1 AND id_paciente = $2',
    [id, pacienteId]
  )

  return { ok: true }
})
