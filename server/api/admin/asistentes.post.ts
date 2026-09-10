import bcrypt from 'bcryptjs'

// POST - Create new assistant (admin only)
export default defineEventHandler(async (event) => {
  const pool = useDbPool()
  const auth = getCookie(event, 'admin_token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!auth) throw createError({ statusCode: 401, message: 'No autorizado' })

  const body = await readBody(event)
  const { nombre, apellido, email, telefono, password, permisos } = body

  if (!nombre || !apellido || !email || !password) {
    throw createError({ statusCode: 400, message: 'Nombre, apellido, email y contraseña son requeridos' })
  }

  // Check if email already exists
  const existing = await pool.query('SELECT id FROM asistentes WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    throw createError({ statusCode: 409, message: 'Ya existe un asistente con ese email' })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const result = await pool.query(
    `INSERT INTO asistentes (nombre, apellido, email, telefono, password_hash, permisos)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, nombre, apellido, email, telefono, activo, permisos, created_at`,
    [nombre, apellido, email, telefono || null, passwordHash, JSON.stringify(permisos || { citas: true, pacientes: true, medicos: false, usuarios: false })]
  )

  return { asistente: result.rows[0] }
})
