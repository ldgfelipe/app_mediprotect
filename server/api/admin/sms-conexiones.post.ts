import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token invalido' }) }

  const body = await readBody(event)
  const { id, nombre, proveedor, account_sid, auth_token, api_url, metodo, from_number, modo, activa, preferida, prioridad, descripcion } = body

  if (!nombre) throw createError({ statusCode: 400, message: 'El nombre es requerido' })

  const pool = useDbPool()

  // Si se marca como preferida, quitar preferida de las demas
  if (preferida) {
    await pool.query('UPDATE sms_conexiones SET preferida = false')
  }

  if (id) {
    // Actualizar
    const sets: string[] = []
    const params: any[] = []
    let idx = 1

    if (nombre !== undefined) { sets.push(`nombre = $${idx++}`); params.push(nombre) }
    if (proveedor !== undefined) { sets.push(`proveedor = $${idx++}`); params.push(proveedor) }
    if (account_sid !== undefined) { sets.push(`account_sid = $${idx++}`); params.push(account_sid) }
    if (auth_token !== undefined && auth_token !== '') { sets.push(`auth_token = $${idx++}`); params.push(auth_token) }
    if (api_url !== undefined) { sets.push(`api_url = $${idx++}`); params.push(api_url) }
    if (metodo !== undefined) { sets.push(`metodo = $${idx++}`); params.push(metodo) }
    if (from_number !== undefined) { sets.push(`from_number = $${idx++}`); params.push(from_number) }
    if (modo !== undefined) { sets.push(`modo = $${idx++}`); params.push(modo) }
    if (activa !== undefined) { sets.push(`activa = $${idx++}`); params.push(activa) }
    if (preferida !== undefined) { sets.push(`preferida = $${idx++}`); params.push(preferida) }
    if (prioridad !== undefined) { sets.push(`prioridad = $${idx++}`); params.push(prioridad) }
    if (descripcion !== undefined) { sets.push(`descripcion = $${idx++}`); params.push(descripcion) }

    if (sets.length === 0) throw createError({ statusCode: 400, message: 'No hay datos para actualizar' })

    sets.push(`updated_at = NOW()`)
    params.push(id)

    const result = await pool.query(
      `UPDATE sms_conexiones SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING id, nombre, proveedor, account_sid, auth_token, api_url, metodo, from_number, modo, activa, preferida, prioridad, descripcion, created_at, updated_at`,
      params
    )
    if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'Conexion no encontrada' })
    return { success: true, conexion: result.rows[0] }
  } else {
    // Crear nueva
    const result = await pool.query(
      `INSERT INTO sms_conexiones (nombre, proveedor, account_sid, auth_token, api_url, metodo, from_number, modo, activa, preferida, prioridad, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, nombre, proveedor, account_sid, auth_token, api_url, metodo, from_number, modo, activa, preferida, prioridad, descripcion, created_at, updated_at`,
      [nombre, proveedor || 'twilio', account_sid || '', auth_token || '', api_url || '', metodo || 'POST', from_number || '', modo || 'sandbox', activa !== false, preferida === true, prioridad || 0, descripcion || '']
    )
    return { success: true, conexion: result.rows[0] }
  }
})
