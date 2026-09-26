import jwt from 'jsonwebtoken'
import { jwtSecret } from '../../utils/secrets'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Segmentos que nunca identifican a un medico. */
const SEGMENTOS_NO_MEDICO = new Set([
  'api', 'www', 'mediprotect', 'mediprotect.com.mx', 'perfil', 'perfiles',
  'red-medica', 'directorio', 'directorio-medico', 'medicos', 'medico',
  'categorias', 'categoria', 'especialidades', 'especialidad', 'planes',
  'contacto', 'about', 'beneficios', 'citas', 'agendar', 'inicio', 'home',
])

/** Prefijos de titulo que el slug del medico no lleva. */
const PREFIJOS_TITULO = ['doctora-', 'doctor-', 'dra-', 'dr-']

interface Candidatos {
  slugs: string[]
  ids: string[]
}

/**
 * Acepta cualquier variante de URL usada por el LandingSite / CRM:
 *   /perfil-dr-{slug}  /perfil-{slug}  /red-medica/{slug}
 *   /directorio-medico/perfil/{id|slug}  /medicos/{uuid}
 *   /directorio-medico-{categoria}/{slug}  /{categoria}/{slug}
 *   slug simple sin dominio, con query, hash, mayusculas o barra final.
 */
function candidatosDesdeUrl(entrada: string): Candidatos {
  const slugs: string[] = []
  const ids: string[] = []
  const vistos = new Set<string>()

  const push = (valor?: string | null) => {
    if (!valor) return
    const s = String(valor).trim().toLowerCase().replace(/^\/+|\/+$/g, '')
    if (!s || s.length < 3 || vistos.has(s)) return
    if (UUID_RE.test(s)) {
      vistos.add(s)
      ids.push(s)
      return
    }
    if (!/^[a-z0-9-]+$/.test(s)) return
    if (SEGMENTOS_NO_MEDICO.has(s)) return
    vistos.add(s)
    slugs.push(s)
    // variantes sin prefijo de titulo (dr-, dra-, ...)
    for (const p of PREFIJOS_TITULO) {
      if (s.startsWith(p) && s.length > p.length) {
        const sin = s.slice(p.length)
        if (!vistos.has(sin)) {
          vistos.add(sin)
          slugs.push(sin)
        }
      }
    }
  }

  const limpia = String(entrada || '').trim().toLowerCase().split(/[?#]/)[0]
  const sinProto = limpia.replace(/^https?:\/\//, '')
  const barra = sinProto.indexOf('/')
  const path = barra === -1 ? `/${sinProto}` : sinProto.slice(barra)
  const segmentos = path.split('/').map((s) => s.trim()).filter(Boolean)

  // 1) Patrones explicitos de perfil (mayor prioridad)
  const patrones = [
    /perfil[-_]dr[-_](.+)$/,
    /perfil[-_](.+)$/,
    /red-medica\/(.+)$/,
    /directorio-medico\/perfil\/(.+)$/,
    /medicos\/(.+)$/,
  ]
  for (const re of patrones) {
    const m = path.match(re)
    if (m && m[1]) push(m[1].split('/')[0])
  }

  // 2) Todos los segmentos: el slug del medico suele ser el ultimo
  for (let i = segmentos.length - 1; i >= 0; i--) push(segmentos[i])

  return { slugs, ids }
}

export default defineEventHandler(async (event) => {
  // Verificar auth (mismo secreto que verifyAdminToken y login-admin)
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '') || getCookie(event, 'admin_token')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try {
    jwt.verify(token, jwtSecret())
  } catch (err: any) {
    if (err?.name === 'TokenExpiredError') {
      throw createError({ statusCode: 401, message: 'Tu sesion expiro, vuelve a iniciar sesion' })
    }
    throw createError({ statusCode: 401, message: 'Token invalido' })
  }

  const body = await readBody(event)
  const { url } = body
  if (!url || !String(url).trim()) {
    throw createError({ statusCode: 400, message: 'La URL es requerida' })
  }

  const { slugs, ids } = candidatosDesdeUrl(String(url))
  if (slugs.length === 0 && ids.length === 0) {
    throw createError({
      statusCode: 400,
      message:
        'No se pudo identificar el medico en la URL. Usa: https://www.mediprotect.com.mx/perfil-dr-{slug}',
    })
  }

  const pool = await useDbPool(event)

  try {
    const SQL_SELECT = `
      SELECT m.*, e.nombre as especialidad_nombre, e.slug as especialidad_slug,
             e.color as especialidad_color, e.icono as especialidad_icono
      FROM medicos m
      LEFT JOIN especialidades e ON m.id_especialidad = e.id
    `

    let medico: any = null

    // 3) Busqueda exacta por id, slug o perfil_url_path (respetando el orden de los candidatos)
    const exacta = await pool.query(
      `${SQL_SELECT}
       WHERE m.activo = true
         AND (
           m.id = ANY($1::uuid[])
           OR m.slug = ANY($2::text[])
           OR m.perfil_url_path = ANY($2::text[])
         )
       ORDER BY array_position($2::text[], m.slug)
       LIMIT 1`,
      [ids, slugs]
    )
    medico = exacta.rows[0] || null

    // 4) Fallback: coincidencia parcial con el primer candidato
    if (!medico && slugs.length > 0) {
      const parcial = await pool.query(
        `${SQL_SELECT}
         WHERE m.activo = true AND (m.slug ILIKE $1 OR m.perfil_url_path ILIKE $1)
         ORDER BY length(m.slug) ASC
         LIMIT 1`,
        [`%${slugs[0]}%`]
      )
      medico = parcial.rows[0] || null
    }

    if (!medico) {
      throw createError({
        statusCode: 404,
        message: `No se encontro un medico activo para "${slugs[0] || ids[0]}". Candidatos probados: ${slugs.join(', ') || ids.join(', ')}`,
      })
    }

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
      hospital: medico.hospital_consultorio || medico.hospital,
      universidad: medico.universidad,
      cedula_profesional: medico.cedula_profesional,
      servicios: medico.servicios || [],
      idiomas: medico.idiomas || ['Espanol'],
      formacion_academica: medico.formacion_academica || [],
      certificaciones: medico.certificaciones
        ? (typeof medico.certificaciones === 'string'
            ? medico.certificaciones.split(',').map((c: string) => c.trim())
            : medico.certificaciones)
        : [],
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
      especialidad_icono: medico.especialidad_icono,
    }

    return { success: true, fuente: 'directorio', perfil }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[Importar Perfil] Error:', err)
    throw createError({
      statusCode: 500,
      message: 'Error al consultar el directorio: ' + (err.message || 'error desconocido'),
    })
  }
})
