// PUT - Update assistant (admin only)
export default defineEventHandler(async (event) => {
  const pool = useDbPool(event)
  const auth = getCookie(event, 'admin_token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!auth) throw createError({ statusCode: 401, message: 'No autorizado' })

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const { nombre, apellido, telefono, activo, permisos } = body

  const result = await pool.query(
    `UPDATE asistentes SET
       nombre = COALESCE($1, nombre),
       apellido = COALESCE($2, apellido),
       telefono = COALESCE($3, telefono),
       activo = COALESCE($4, activo),
       permisos = COALESCE($5, permisos),
       updated_at = NOW()
     WHERE id = $6
     RETURNING id, nombre, apellido, email, telefono, activo, permisos, updated_at`,
    [nombre || null, apellido || null, telefono || null, activo, permisos ? JSON.stringify(permisos) : null, id]
  )

  if (result.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Asistente no encontrado' })
  }

  return { asistente: result.rows[0] }
})
