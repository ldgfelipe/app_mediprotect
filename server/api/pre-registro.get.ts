import { getPool } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const curp = (query.curp as string || '').toUpperCase().trim()
  const email = (query.email as string || '').trim()

  if (!curp && !email) {
    throw createError({ statusCode: 400, message: 'Proporciona CURP o email' })
  }

  const pool = getPool()

  let sql = `SELECT id, curp, nombre, apellido_paterno, apellido_materno,
    fecha_nacimiento, genero, email, telefono,
    codigo_postal, colonia, municipio, estado, ciudad, direccion,
    doctor_nombre, estado_registro, creado_en
    FROM pre_registros
    WHERE estado_registro = 'pendiente'`

  const params: any[] = []
  let paramIdx = 1

  if (curp) {
    sql += ` AND curp = $${paramIdx}`
    params.push(curp)
    paramIdx++
  }
  if (email) {
    sql += ` AND email = $${paramIdx}`
    params.push(email)
    paramIdx++
  }

  sql += ' ORDER BY creado_en DESC LIMIT 1'

  const result = await pool.query(sql, params)

  if (result.rows.length === 0) {
    return { encontrado: false }
  }

  return { encontrado: true, pre_registro: result.rows[0] }
})
