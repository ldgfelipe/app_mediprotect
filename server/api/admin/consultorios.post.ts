import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'admin_token') || getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!token) throw createError({ statusCode: 401, message: 'No autorizado' })
  try { jwt.verify(token, process.env.JWT_SECRET || 'mediprotect_jwt_secret_key_2026') }
  catch { throw createError({ statusCode: 401, message: 'Token inválido' }) }

  const body = await readBody(event)
  const { id_medico, nombre, direccion, codigo_postal, colonia, ciudad, estado, hospital_consultorio, google_maps_url, es_principal } = body

  if (!id_medico) throw createError({ statusCode: 400, message: 'id_medico requerido' })

  const pool = useDbPool(event)

  if (es_principal) {
    await pool.query('UPDATE consultorios SET es_principal = false WHERE id_medico = $1', [id_medico])
  }

  const result = await pool.query(
    `INSERT INTO consultorios (id_medico, nombre, direccion, codigo_postal, colonia, ciudad, estado, hospital_consultorio, google_maps_url, es_principal)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [id_medico, nombre || null, direccion || null, codigo_postal || null, colonia || null, ciudad || null, estado || null, hospital_consultorio || null, google_maps_url || null, es_principal || false]
  )

  return { consultorio: result.rows[0] }
})
