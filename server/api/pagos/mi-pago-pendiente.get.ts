import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user
  try {
    user = jwt.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const pool = useDbPool()

  const result = await pool.query(
    `SELECT p.id, p.monto, p.estado, p.created_at, p.id_plan,
            paq.nombre as plan_nombre
     FROM pagos p
     LEFT JOIN paquetes paq ON paq.id = p.id_plan
     WHERE p.id_paciente = $1
       AND p.estado = 'pendiente'
     ORDER BY p.created_at DESC
     LIMIT 1`,
    [user.id]
  )

  return { pago: result.rows[0] || null }
})
