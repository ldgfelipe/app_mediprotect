// PUT - Asistente cambia estado de una cita
export default defineEventHandler(async (event) => {
  const pool = await useDbPool(event)
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user
  try {
    const jwt = await import('jsonwebtoken')
    user = jwt.default.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  if (user.tipo !== 'asistente' && user.tipo !== 'admin') {
    throw createError({ statusCode: 403, message: 'No autorizado' })
  }

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const { estado, descripcion, notas } = body

  const estadosValidos = ['pendiente', 'confirmada', 'paciente_llego', 'en_atencion', 'asistida', 'no_asistida', 'cancelada', 'reagendada']
  if (!estadosValidos.includes(estado)) {
    throw createError({ statusCode: 400, message: `Estado inválido. Válidos: ${estadosValidos.join(', ')}` })
  }

  // Get current cita
  const current = await pool.query('SELECT * FROM citas WHERE id = $1', [id])
  if (current.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'Cita no encontrada' })
  }

  const cita = current.rows[0]
  const estadoAnterior = cita.estado

  // Build update
  const updates = ['estado = $1', 'updated_at = NOW()']
  const params = [estado]
  let paramIdx = 2

  if (notas) {
    updates.push(`notas_asistente = $${paramIdx}`)
    params.push(notas)
    paramIdx++
  }

  // Timestamps based on state
  if (estado === 'paciente_llego') {
    updates.push('paciente_llego_at = NOW()')
  } else if (estado === 'en_atencion') {
    updates.push('inicio_atencion_at = NOW()')
  } else if (estado === 'asistida' || estado === 'no_asistida') {
    updates.push('fin_atencion_at = NOW()')
  }

  params.push(id)
  await pool.query(`UPDATE citas SET ${updates.join(', ')} WHERE id = $${paramIdx}`, params)

  // Log in bitácora
  await pool.query(
    `INSERT INTO citas_bitacora (id_cita, id_usuario, tipo_usuario, accion, estado_anterior, estado_nuevo, descripcion, created_at)
     VALUES ($1, $2, 'asistente', 'cambio_estado', $3, $4, $5, NOW())`,
    [id, user.id, estadoAnterior, estado, descripcion || `Estado cambiado de ${estadoAnterior} a ${estado}`]
  )

  return { ok: true, estado_anterior: estadoAnterior, estado_nuevo: estado }
})
