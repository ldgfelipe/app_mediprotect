import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const pool = useDbPool()

  // 1. Verificar que el paciente existe
  const existing = await pool.query('SELECT id, nombre FROM pacientes WHERE id = $1', [id])
  if (existing.rowCount === 0) {
    throw createError({ statusCode: 404, message: 'Paciente no encontrado' })
  }

  const pacienteNombre = existing.rows[0].nombre

  // 2. Eliminar de empresas_pacientes (vínculo paciente-empresa)
  await pool.query(
    'DELETE FROM empresas_pacientes WHERE id_paciente = $1',
    [id]
  )

  // 3. Eliminar de citas (por id_paciente)
  await pool.query(
    'DELETE FROM citas WHERE id_paciente = $1',
    [id]
  )

  // 4. Eliminar al paciente (soft-delete por restricción FK NO ACTION)
  await pool.query(
    'UPDATE pacientes SET active = FALSE WHERE id = $1',
    [id]
  )

  return { success: true, mensaje: `Paciente ${pacienteNombre} marcado como inactivo. Se borraron sus citas y vínculos empresa.` }
})