import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'default_secret') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const pool = getPool()
  const result = await pool.query(`
    SELECT p.id, p.monto, p.metodo_pago, p.referencia, p.estatus, p.created_at as fecha,
           CONCAT(pac.nombre, ' ', pac.apellido) as paciente_nombre, pac.email as paciente_email,
           paq.nombre as plan_nombre
    FROM pagos p
    LEFT JOIN pacientes pac ON p.id_paciente = pac.id
    LEFT JOIN paquetes paq ON p.id_paquete = paq.id
    ORDER BY p.created_at DESC
  `)
  return { pagos: result.rows }
})
