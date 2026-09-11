import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  // Verificar auth
  const authHeader = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!authHeader) throw createError({ statusCode: 401, message: 'No autorizado' })

  let user: any
  try {
    user = jwt.verify(authHeader, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026')
  } catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  if (!['asistente', 'admin'].includes(user.tipo?.toLowerCase())) {
    throw createError({ statusCode: 403, message: 'Acceso no autorizado' })
  }

  const query = getQuery(event)
  const termino = (query.q as string || '').trim()

  if (!termino || termino.length < 2) {
    throw createError({ statusCode: 400, message: 'El término de búsqueda debe tener al menos 2 caracteres' })
  }

  const pool = await useDbPool(event)

  // Búsqueda flexible: ignora "Dr.", "Dra.", espacios extra, y busca parcial
  const terminoLimpio = termino
    .replace(/^(dra?\.?\s*)/i, '')
    .trim()
    .toLowerCase()

  // Buscar médicos que coincidan con el nombre (parcial, flexible)
  const medicosResult = await pool.query(`
    SELECT m.id, m.nombre, m.apellido, m.titulo, m.foto_url, m.email, m.telefono,
           m.slug, m.cedula_profesional, m.activo,
           e.nombre as especialidad_nombre, e.color as especialidad_color
    FROM medicos m
    LEFT JOIN especialidades e ON m.id_especialidad = e.id
    WHERE m.activo = true
      AND (
        LOWER(m.nombre) ILIKE '%' || $1 || '%'
        OR LOWER(m.apellido) ILIKE '%' || $1 || '%'
        OR LOWER(CONCAT(COALESCE(m.nombre, ''), ' ', COALESCE(m.apellido, ''))) ILIKE '%' || $1 || '%'
        OR LOWER(m.slug) ILIKE '%' || $1 || '%'
        OR LOWER(m.cedula_profesional) ILIKE '%' || $1 || '%'
        OR LOWER(e.nombre) ILIKE '%' || $1 || '%'
      )
    ORDER BY
      CASE
        WHEN LOWER(m.nombre) = $1 OR LOWER(m.apellido) = $1 THEN 0
        WHEN LOWER(m.nombre) ILIKE $1 || '%' OR LOWER(m.apellido) ILIKE $1 || '%' THEN 1
        ELSE 2
      END,
      m.nombre, m.apellido
    LIMIT 10
  `, [terminoLimpio])

  if (medicosResult.rows.length === 0) {
    return { medicos: [], mensaje: `No se encontraron médicos con el nombre "${termino}"` }
  }

  // Para cada médico encontrado, obtener sus próximas 20 citas
  const medicosConCitas = []

  for (const medico of medicosResult.rows) {
    const citasResult = await pool.query(`
      SELECT c.id, c.fecha_hora, c.estado, c.notas_paciente, c.notas_asistente,
             p.nombre as paciente_nombre, p.apellido as paciente_apellido,
             p.telefono as paciente_telefono
      FROM citas c
      LEFT JOIN pacientes p ON p.id = c.id_paciente
      WHERE c.id_medico = $1
        AND c.fecha_hora >= NOW() - INTERVAL '7 days'
        AND c.estado NOT IN ('cancelada', 'no_asistida')
      ORDER BY c.fecha_hora ASC
      LIMIT 20
    `, [medico.id])

    // Contar citas por estado
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
        COUNT(*) FILTER (WHERE estado = 'confirmada') as confirmadas,
        COUNT(*) FILTER (WHERE fecha_hora >= DATE_TRUNC('day', NOW()) AND fecha_hora < DATE_TRUNC('day', NOW()) + INTERVAL '1 day') as hoy
      FROM citas
      WHERE id_medico = $1 AND estado NOT IN ('cancelada', 'no_asistida')
    `, [medico.id])

    medicosConCitas.push({
      ...medico,
      citas: citasResult.rows,
      estadisticas: statsResult.rows[0]
    })
  }

  return { medicos: medicosConCitas }
})
