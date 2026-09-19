
export default defineEventHandler(async (event) => {
const _user = verifyAdminOrAsistenteToken(event)

  const body = await readBody(event)
  const { id_medico, nombre, direccion, codigo_postal, colonia, ciudad, estado, hospital_consultorio, google_maps_url, es_principal } = body

  if (!id_medico) throw createError({ statusCode: 400, message: 'id_medico requerido' })

  const pool = await useDbPool(event)

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
