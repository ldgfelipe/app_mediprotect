
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const body = await readBody(event)
  const { id } = body
  if (!id) throw createError({ statusCode: 400, message: 'El id es requerido' })

  const pool = await useDbPool(event)
  const result = await pool.query('DELETE FROM sms_conexiones WHERE id = $1 RETURNING id, nombre', [id])
  if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'Conexion no encontrada' })

  return { success: true, eliminada: result.rows[0] }
})
