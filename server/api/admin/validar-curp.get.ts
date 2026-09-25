const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{2}[BCDHJLMNPQRSTVWXYZ]{3}[A-Z0-9]\d$/

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const curp = String(query.curp || '').toUpperCase().trim()

  if (curp.length !== 18) {
    throw createError({ statusCode: 400, message: 'La CURP debe tener 18 caracteres' })
  }
  if (!CURP_REGEX.test(curp)) {
    throw createError({ statusCode: 400, message: 'El formato de CURP no es valido' })
  }

  const pool = await useDbPool(event)
  const datos = await consultarCurp(pool, curp)

  const existe = await pool.query('SELECT id FROM pacientes WHERE curp = $1', [curp])

  return { ...datos, existe: existe.rows.length > 0 }
})
