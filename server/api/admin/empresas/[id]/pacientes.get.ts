import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const id = getRouterParam(event, 'id')
  const pool = useDbPool()

  const result = await pool.query(`
    SELECT ep.*, p.nombre, p.apellido, p.email, p.telefono
    FROM empresa_pacientes ep
    JOIN pacientes p ON p.id = ep.id_paciente
    WHERE ep.id_empresa = $1 AND ep.activo = true
    ORDER BY ep.fecha_asignacion DESC
  `, [id])

  return { pacientes: result.rows }
})
