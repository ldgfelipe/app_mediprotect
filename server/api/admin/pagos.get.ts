import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user: any
  try {
    user = jwt.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  if (!['admin', 'asistente', 'Administrador'].includes(user.tipo)) {
    throw createError({ statusCode: 403, message: 'Acceso no autorizado' })
  }

  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 20
  const offset = (page - 1) * limit
  const estado = query.estado as string || ''
  const provedor = query.provedor as string || ''
  const sandbox = query.sandbox as string || ''
  const buscar = query.buscar as string || ''

  const pool = useDbPool()

  let where = 'WHERE 1=1'
  const params: any[] = []
  let paramIdx = 1

  if (estado) {
    where += ` AND p.estado = $${paramIdx++}`
    params.push(estado)
  }
  if (provedor) {
    where += ` AND p.provedor = $${paramIdx++}`
    params.push(provedor)
  }
  if (sandbox !== '') {
    where += ` AND p.sandbox = $${paramIdx++}`
    params.push(sandbox === 'true')
  }
  if (buscar) {
    where += ` AND (
      pa.nombre ILIKE $${paramIdx} OR
      pa.email ILIKE $${paramIdx} OR
      pa.telefono ILIKE $${paramIdx} OR
      paq.nombre ILIKE $${paramIdx} OR
      p.provedor_pago_id ILIKE $${paramIdx}
    )`
    params.push(`%${buscar}%`)
    paramIdx++
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM pagos p
     LEFT JOIN pacientes pa ON pa.id = p.id_paciente
     LEFT JOIN paquetes paq ON paq.id = p.id_plan
     ${where}`,
    params
  )

  const pagosResult = await pool.query(
    `SELECT p.*,
      pa.nombre as paciente_nombre,
      pa.email as paciente_email,
      pa.telefono as paciente_telefono,
      paq.nombre as plan_nombre
    FROM pagos p
    LEFT JOIN pacientes pa ON pa.id = p.id_paciente
    LEFT JOIN paquetes paq ON paq.id = p.id_plan
    ${where}
    ORDER BY p.created_at DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  )

  return {
    pagos: pagosResult.rows,
    total: parseInt(countResult.rows[0].total),
    page,
    limit,
    pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
  }
})
