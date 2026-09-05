import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  let decoded: any
  try { decoded = jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token invalido' }) }

  const body = await readBody(event)
  const { telefono, descripcion } = body

  if (!telefono) throw createError({ statusCode: 400, message: 'El telefono es requerido' })

  const telefonoLimpio = telefono.replace(/[^0-9+]/g, '')
  if (telefonoLimpio.length < 10) {
    throw createError({ statusCode: 400, message: 'El telefono debe tener al menos 10 digitos' })
  }

  const pool = getPool()
  try {
    await pool.query(
      'INSERT INTO telefonos_verificados (telefono, descripcion, verificado_por) VALUES ($1, $2, $3)',
      [telefonoLimpio, descripcion || '', decoded.email || 'admin']
    )
  } catch (e: any) {
    if (e.code === '23505') {
      throw createError({ statusCode: 409, message: 'Este telefono ya esta verificado' })
    }
    throw e
  }

  return { success: true, mensaje: 'Telefono verificado agregado' }
})
