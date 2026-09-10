import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token invalido' }) }

  const body = await readBody(event)
  const { id, titulo, descripcion, tipo, version, estado } = body

  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const pool = useDbPool()
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
