import jwt from 'jsonwebtoken'

function verifyAdmin(event: any) {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }
}

export default defineEventHandler(async (event) => {
  verifyAdmin(event)
  const pool = useDbPool(event)
  const result = await pool.query(`
    SELECT t.id, t.nombre, t.token_preview, t.permisos, t.activo, t.ultimo_uso, t.created_at,
           t.user_id, t.user_tipo,
           CASE WHEN t.user_tipo = 'medico' THEN m.nombre || ' ' || m.apellido
                ELSE p.nombre || ' ' || p.apellido END as user_nombre,
           CASE WHEN t.user_tipo = 'medico' THEN m.email ELSE p.email END as user_email
    FROM api_tokens t
    LEFT JOIN medicos m ON t.user_id = m.id AND t.user_tipo = 'medico'
    LEFT JOIN pacientes p ON t.user_id = p.id AND t.user_tipo = 'paciente'
    ORDER BY t.created_at DESC
  `)
  return { tokens: result.rows }
})