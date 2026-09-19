
export default defineEventHandler(async (event) => {
const _user = verifyAdminOrAsistenteToken(event)

  const body = await readBody(event)
  const pool = await useDbPool(event)

  const result = await pool.query(`
    INSERT INTO empresas (nombre, rfc, email, telefono, contacto_nombre, direccion, ciudad, estado, google_maps_url)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `, [body.nombre, body.rfc, body.email, body.telefono, body.contacto_nombre, body.direccion, body.ciudad, body.estado, body.google_maps_url || null])

  setResponseStatus(event, 201)
  return { empresa: result.rows[0] }
})
