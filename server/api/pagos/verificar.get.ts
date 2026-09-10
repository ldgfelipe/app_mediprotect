export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const pagoId = query.pago_id as string

  if (!pagoId) {
    throw createError({ statusCode: 400, message: 'pago_id es requerido' })
  }

  const pool = useDbPool()

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

  return { pago: result.rows[0] }
})
