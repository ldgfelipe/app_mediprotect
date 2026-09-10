import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'token') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token invalido' }) }

  const query = getQuery(event)
  const telefono = query.telefono as string

  if (!telefono) throw createError({ statusCode: 400, message: 'Telefono requerido' })

  const telefonoLimpio = telefono.replace(/[^0-9]/g, '')
  const pool = useDbPool()

  const result = await pool.query(
    'SELECT id FROM telefonos_verificados WHERE telefono LIKE $1 OR telefono = $2',
    ['%' + telefonoLimpio.slice(-10), telefono]
  )

  return { verificado: result.rowCount > 0 }
})
