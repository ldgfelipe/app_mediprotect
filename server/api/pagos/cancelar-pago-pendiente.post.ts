import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user
  try {
    user = jwt.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const body = await readBody(event)
  const { pago_id } = body
  if (!pago_id) throw createError({ statusCode: 400, message: 'pago_id requerido' })

  const pool = useDbPool(event)

  const result = await pool.query(
    `UPDATE pagos SET estado = 'cancelado', updated_at = NOW()
     WHERE id = $1 AND id_paciente = $2 AND estado = 'pendiente'
     RETURNING id`,
    [pago_id, user.id]
  )

  if (result.rowCount === 0) {
    throw createError({ statusCode: 404, message: 'Pago no encontrado o ya procesado' })
  }

  return { success: true }
})
