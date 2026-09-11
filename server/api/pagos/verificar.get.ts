export default defineEventHandler(async (event) => {
  const user = verifyToken(event)
  const query = getQuery(event)
  const pagoId = query.pago_id as string

  if (!pagoId) {
    throw createError({ statusCode: 400, message: 'pago_id es requerido' })
  }

  const pool = useDbPool(event)

  const result = await pool.query(
    `SELECT p.*, paq.nombre as plan_nombre, pa.nombre as paciente_nombre, pa.email as paciente_email
     FROM pagos p
     LEFT JOIN paquetes paq ON paq.id = p.id_plan
     LEFT JOIN pacientes pa ON pa.id = p.id_paciente
     WHERE p.id = $1`,
    [pagoId]
  )

  if (result.rowCount === 0) {
    throw createError({ statusCode: 404, message: 'Pago no encontrado' })
  }

  const pago = result.rows[0]
  if (user.tipo !== 'admin' && user.id !== pago.id_paciente) {
    throw createError({ statusCode: 403, message: 'No puedes ver pagos de otro paciente' })
  }

  return { pago }
})
