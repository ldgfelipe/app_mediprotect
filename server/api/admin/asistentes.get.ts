import bcrypt from 'bcryptjs'

// GET - List all assistants (admin only)
export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  const auth = getCookie(event, 'admin_token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!auth) throw createError({ statusCode: 401, message: 'No autorizado' })

  const result = await pool.query(
    'SELECT id, nombre, apellido, email, telefono, activo, permisos, created_at FROM asistentes ORDER BY created_at DESC'
  )

  return { asistentes: result.rows }
})
