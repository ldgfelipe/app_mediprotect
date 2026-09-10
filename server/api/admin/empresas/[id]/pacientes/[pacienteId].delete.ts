import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const id = getRouterParam(event, 'id')
  const pacienteId = getRouterParam(event, 'pacienteId')

  const pool = useDbPool(event)

  await pool.query(
    'UPDATE empresa_pacientes SET activo = false WHERE id_empresa = $1 AND id_paciente = $2',
    [id, pacienteId]
  )

  return { ok: true }
})
