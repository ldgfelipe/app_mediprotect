
export default defineEventHandler(async (event) => {
const _user = verifyAdminOrAsistenteToken(event)

  const { id } = getRouterParams(event)
  const body = await readBody(event)
  const { nombre, direccion, codigo_postal, colonia, ciudad, estado, hospital_consultorio, google_maps_url, es_principal, activo } = body

  const pool = await useDbPool(event)

  if (es_principal) {
    const consultorio = await pool.query('SELECT id_medico FROM consultorios WHERE id = $1', [id])
    if (consultorio.rows.length > 0) {
      await pool.query('UPDATE consultorios SET es_principal = false WHERE id_medico = $1 AND id != $2', [consultorio.rows[0].id_medico, id])
    }
  }

  const result = await pool.query(
    `UPDATE consultorios SET
       nombre = COALESCE($1, nombre),
       direccion = COALESCE($2, direccion),
       codigo_postal = COALESCE($3, codigo_postal),
       colonia = COALESCE($4, colonia),
       ciudad = COALESCE($5, ciudad),
       estado = COALESCE($6, estado),
       hospital_consultorio = COALESCE($7, hospital_consultorio),
       google_maps_url = COALESCE($8, google_maps_url),
       es_principal = COALESCE($9, es_principal),
       activo = COALESCE($10, activo),
       updated_at = NOW()
     WHERE id = $11
     RETURNING *`,
    [nombre || null, direccion || null, codigo_postal || null, colonia || null, ciudad || null, estado || null, hospital_consultorio || null, google_maps_url || null, es_principal, activo, id]
  )

  if (result.rows.length === 0) throw createError({ statusCode: 404, message: 'Consultorio no encontrado' })
  return { consultorio: result.rows[0] }
})
