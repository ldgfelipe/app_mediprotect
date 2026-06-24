import { verifyToken } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const decoded = verifyToken(event)
  const pool = getPool()
  const { id, tipo } = decoded

  if (tipo === 'medico') {
    const result = await pool.query(
      `SELECT m.*, e.nombre as especialidad FROM medicos m
       LEFT JOIN especialidades e ON m.id_especialidad = e.id WHERE m.id = $1`, [id]
    )
    if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'No encontrado' })
    return { usuario: result.rows[0] }
  }

  const result = await pool.query(
    'SELECT id, nombre, apellido, email, telefono, fecha_nacimiento, genero, direccion, created_at FROM pacientes WHERE id = $1', [id]
  )
  if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'No encontrado' })
  return { usuario: result.rows[0] }
})
