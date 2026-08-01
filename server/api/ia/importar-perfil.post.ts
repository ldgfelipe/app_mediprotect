import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  // Verificar auth
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const body = await readBody(event)
  const { url } = body

  if (!url) {
    throw createError({ statusCode: 400, message: 'La URL es requerida' })
  }

  // Extraer slug de la URL
  const slug = extraerSlug(url)
  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'No se pudo extraer el slug de la URL. Formato esperado: https://www.mediprotect.com.mx/perfil-dr-{slug} o https://www.mediprotect.com.mx/{slug}'
    })
  }

  // Llamar a la API de directorio para obtener el perfil
  const pool = getPool()

  try {
    // Buscar médico por slug en nuestra DB
    const result = await pool.query(`
      SELECT m.*, e.nombre as especialidad_nombre, e.slug as especialidad_slug,
             e.color as especialidad_color, e.icono as especialidad_icono
      FROM medicos m
      LEFT JOIN especialidades e ON m.id_especialidad = e.id
      WHERE m.slug = $1 AND m.activo = true
      LIMIT 1
    `, [slug])

    if (result.rowCount === 0) {
      throw createError({
        statusCode: 404,
        message: `No se encontró un médico con el slug "${slug}" en el directorio. Verifica que la URL sea correcta.`
      })
    }

    const medico = result.rowCount > 0 ? result.rows[0] : null

    // Si no está en nuestra DB, intentar obtener datos básicos del slug
    if (!medico) {
      // Construir nombre desde el slug
      const nombreFormateado = slug
        .split('-')
        .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')

      return {
        success: true,
        fuente: 'slug',
        perfil: {
          slug,
          nombre_completo: nombreFormateado,
          nombre: nombreFormateado.split(' ').slice(0, -2).join(' ') || nombreFormateado,
          apellido: nombreFormateado.split(' ').slice(-2).join(' ') || '',
          foto_url: null,
          bio: null,
          especialidad: null,
          ciudad: null,
          hospital: null,
          universidad: null,
          cedula_profesional: null,
          servicios: [],
          idiomas: ['Español'],
          formacion_academica: [],
          certificaciones: [],
          horario_atencion: null,
          precio_regular: null,
          precio_miembro: null,
          whatsapp: null,
          frase_inspiradora: null
        }
      }
    }

    // Formatear datos desde la DB
    const perfil = {
      id: medico.id,
      slug: medico.slug,
      nombre: medico.nombre,
      apellido: medico.apellido,
      nombre_completo: `${medico.titulo || 'Dr.'} ${medico.nombre} ${medico.apellido}`,
      titulo: medico.titulo,
      foto_url: medico.foto_url,
      bio: medico.bio,
      especialidad: medico.especialidad_nombre,
      subespecialidad: medico.subespecialidad,
      ciudad: medico.consultorio_ciudad,
      hospital: medico.hospital,
      universidad: medico.universidad,
      cedula_profesional: medico.cedula_profesional,
      servicios: medico.servicios || [],
      idiomas: medico.idiomas || ['Español'],
      formacion_academica: medico.formacion_academica || [],
      certificaciones: medico.certificaciones ? (typeof medico.certificaciones === 'string' ? medico.certificaciones.split(',').map((c: string) => c.trim()) : medico.certificaciones) : [],
      horario_atencion: medico.horario_atencion,
      precio_regular: medico.precio_regular,
      precio_miembro: medico.precio_miembro,
      whatsapp: medico.whatsapp || medico.telefono,
      frase_inspiradora: medico.frase_inspiradora,
      email: medico.email,
      telefono: medico.telefono,
      especialidad_id: medico.id_especialidad,
      especialidad_nombre: medico.especialidad_nombre,
      especialidad_slug: medico.especialidad_slug,
      especialidad_color: medico.especialidad_color,
      especialidad_icono: medico.especialidad_icono
    }

    return {
      success: true,
      fuente: 'directorio',
      perfil
    }

  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      message: 'Error al consultar el directorio: ' + err.message
    })
  }
})

function extraerSlug(url: string): string | null {
  // Limpiar URL
  const cleanUrl = url.trim().toLowerCase()

  // Patrón 1: https://www.mediprotect.com.mx/perfil-dr-{slug}
  let match = cleanUrl.match(/mediprotect\.com\.mx\/perfil[-_]dr[-_]([a-z0-9-]+)/)
  if (match) return match[1]

  // Patrón 2: https://www.mediprotect.com.mx/perfil-{slug}
  match = cleanUrl.match(/mediprotect\.com\.mx\/perfil[-_]([a-z0-9-]+)/)
  if (match) return match[1]

  // Patrón 3: https://www.mediprotect.com.mx/red-medica/{slug}
  match = cleanUrl.match(/mediprotect\.com\.mx\/red-medica\/([a-z0-9-]+)/)
  if (match) return match[1]

  // Patrón 4: https://www.mediprotect.com.mx/{slug} (directo)
  match = cleanUrl.match(/mediprotect\.com\.mx\/([a-z0-9-]+)/)
  if (match) {
    const slug = match[1]
    // Excluir páginas que no son perfiles
    const excluded = ['red-medica', 'beneficios', 'directorio-medico', 'planes', 'contacto', 'about']
    if (!excluded.some(e => slug.startsWith(e))) {
      return slug
    }
  }

  // Patrón 5: Si es solo el slug (sin URL)
  if (/^[a-z0-9-]+$/.test(cleanUrl) && cleanUrl.length > 3) {
    return cleanUrl
  }

  return null
}
