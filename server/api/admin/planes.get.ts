import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inv�lido' }) }

  const pool = useDbPool(event)
  const result = await pool.query(`
    SELECT paq.*, COALESCE(json_agg(json_build_object('id', pb.id, 'beneficio', pb.beneficio)) FILTER (WHERE pb.id IS NOT NULL), '[]') as beneficios
    FROM paquetes paq
    LEFT JOIN paquete_beneficios pb ON paq.id = pb.id_paquete
    GROUP BY paq.id
    ORDER BY paq.precio ASC
  `)
  return { planes: result.rows }
})
