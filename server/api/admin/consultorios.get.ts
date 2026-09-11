
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const query = getQuery(event)
  const id_medico = query.id_medico as string
  if (!id_medico) throw createError({ statusCode: 400, message: 'id_medico requerido' })

  const pool = await useDbPool(event)
  const result = await pool.query(
    'SELECT * FROM consultorios WHERE id_medico = $1 ORDER BY es_principal DESC, created_at ASC',
    [id_medico]
  )

  return { consultorios: result.rows }
})
