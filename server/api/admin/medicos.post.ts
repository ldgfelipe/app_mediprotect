import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'default_secret') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const body = await readBody(event)
  const {
    nombre, apellido, email, telefono, cedula_profesional,
    titulo, especialidad, ciudad, hospital, bio, servicios,
    universidad, horario_atencion, idiomas
  } = body

  if (!nombre || !apellido) {
    throw createError({ statusCode: 400, message: 'Nombre y apellido son requeridos' })
  }

  const pool = getPool()

  // Buscar o crear especialidad
  let idEspecialidad = null
  if (especialidad) {
    const espResult = await pool.query(
      'SELECT id FROM especialidades WHERE LOWER(nombre) = LOWER($1) LIMIT 1',
      [especialidad]
    )
    if (espResult.rowCount > 0) {
      idEspecialidad = espResult.rows[0].id
    } else {
      const newEsp = await pool.query(
        'INSERT INTO especialidades (nombre) VALUES ($1) RETURNING id',
        [especialidad]
      )
      idEspecialidad = newEsp.rows[0].id
    }
  }

  // Generar slug
  const slug = `${nombre} ${apellido}`
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')

  // Preparar datos JSON
  const serviciosArray = servicios ? servicios.split(',').map((s: string) => s.trim()).filter(Boolean) : []
  const idiomasArray = idiomas ? idiomas.split(',').map((i: string) => i.trim()).filter(Boolean) : ['Español']

  try {
    const result = await pool.query(`
      INSERT INTO medicos (
        nombre, apellido, email, telefono, cedula_profesional,
        titulo, id_especialidad, slug, activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING id, nombre, apellido, email, telefono, cedula_profesional,
                titulo, slug, activo, created_at
    `, [
      nombre, apellido, email || null, telefono || null, cedula_profesional || null,
      titulo || null, idEspecialidad, slug
    ])

    const medico = result.rows[0]

    // Actualizar campos adicionales si la tabla los soporta
    // Nota: campos como bio, servicios, universidad, etc. se actualizan después
    // ya que pueden no existir en todas las versiones del schema

    return {
      success: true,
      medico: {
        ...medico,
        especialidad_nombre: especialidad,
        consultorio_ciudad: ciudad
      }
    }
  } catch (err: any) {
    if (err.code === '23505') {
      throw createError({ statusCode: 400, message: 'Ya existe un médico con esa cédula o email' })
    }
    throw createError({ statusCode: 500, message: 'Error al guardar médico: ' + err.message })
  }
})
