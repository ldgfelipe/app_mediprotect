
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const body = await readBody(event)
  const { id, titulo, descripcion, tipo, version, estado } = body

  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const pool = useDbPool(event)
  const result = await pool.query(
    `UPDATE actualizaciones_sistema SET
       titulo = COALESCE($1, titulo),
       descripcion = COALESCE($2, descripcion),
       tipo = COALESCE($3, tipo),
       version = COALESCE($4, version),
       estado = COALESCE($5, estado),
       updated_at = NOW()
     WHERE id = $6 RETURNING *`,
    [titulo, descripcion, tipo, version, estado, id]
  )

  if (result.rowCount === 0) throw createError({ statusCode: 404, message: 'No encontrada' })
  return { success: true, actualizacion: result.rows[0] }
})
