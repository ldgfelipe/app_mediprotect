
export default defineEventHandler(async (event) => {
const _user = verifyAdminToken(event)

  const body = await readBody(event)
  const pool = await useDbPool(event)

  const result = await pool.query(
    'INSERT INTO paquetes (nombre, descripcion, precio, duracion_dias) VALUES ($1,$2,$3,$4) RETURNING *',
    [body.nombre, body.descripcion, body.precio, body.duracion_dias]
  )
  setResponseStatus(event, 201)
  return { plan: result.rows[0] }
})
