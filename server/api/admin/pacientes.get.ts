
export default defineEventHandler(async (event) => {
const _user = verifyAdminOrAsistenteToken(event)

  const pool = await useDbPool(event)
  const buscar = getQuery(event).buscar as string | undefined

  let query = 'SELECT id, nombre, apellido, email, telefono, curp, genero, estado_civil, id_empresa, email_confirmado, telefono_confirmado, created_at FROM pacientes'
  const params: any[] = []

  if (buscar && buscar.length >= 2) {
    query += ` WHERE (nombre ILIKE $1 OR apellido ILIKE $1 OR email ILIKE $1)`
    params.push(`%${buscar}%`)
  }

  query += ' ORDER BY created_at DESC LIMIT 20'

  const result = await pool.query(query, params)
  return { pacientes: result.rows }
})
