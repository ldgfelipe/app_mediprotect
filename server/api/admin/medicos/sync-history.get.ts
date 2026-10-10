import jwt from 'jsonwebtoken'
import { jwtSecret } from '../../../utils/secrets'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try {
    jwt.verify(token, jwtSecret())
  } catch (err: any) {
    if (err?.name === 'TokenExpiredError') {
      throw createError({ statusCode: 401, message: 'Tu sesion expiro, vuelve a iniciar sesion' })
    }
    throw createError({ statusCode: 401, message: 'Token invalido' })
  }

  const pool = await useDbPool(event)
  
  const result = await pool.query(`
    SELECT id, slug, status, mensaje, datos_anteriores, datos_nuevos, duracion_ms, creado_en
    FROM medicos_sync_log
    ORDER BY creado_en DESC
    LIMIT 100
  `)

  return { logs: result.rows }
})