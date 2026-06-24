export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const pool = getPool()

  const result = await pool.query(`
    INSERT INTO empresas (nombre, rfc, email, telefono, contacto_nombre, direccion, ciudad, estado, activo)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8, false)
    RETURNING id, nombre, email
  `, [body.nombre, body.rfc, body.email, body.telefono, body.contacto_nombre, body.direccion, body.ciudad, body.estado])

  setResponseStatus(event, 201)
  return { mensaje: 'Solicitud recibida. Te contactaremos pronto.', id: result.rows[0].id }
})
