
export default defineEventHandler(async (event) => {
const _user = verifyAdminOrAsistenteToken(event)

  const pool = await useDbPool(event)
  const id = getRouterParam(event, 'id')

  const existing = await pool.query('SELECT id FROM medicos WHERE id = $1', [id])
  if (existing.rowCount === 0) {
    throw createError({ statusCode: 404, message: 'Médico no encontrado' })
  }

  await pool.query('UPDATE medicos SET activo = false WHERE id = $1', [id])

  return { success: true, message: 'Médico desactivado exitosamente' }
})