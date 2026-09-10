import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin_token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const query = getQuery(event)
  const id_medico = query.id_medico as string
  if (!id_medico) throw createError({ statusCode: 400, message: 'id_medico requerido' })

  const pool = useDbPool(event)
  const result = await pool.query(
    'SELECT * FROM consultorios WHERE id_medico = $1 ORDER BY es_principal DESC, created_at ASC',
    [id_medico]
  )

  return { consultorios: result.rows }
})
