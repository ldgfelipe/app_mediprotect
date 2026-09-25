const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const curp = String(query.curp || '').toUpperCase().trim()

  if (curp.length !== 18) {
    throw createError({ statusCode: 400, message: 'La CURP debe tener exactamente 18 caracteres' })
  }

  if (!CURP_REGEX.test(curp)) {
    throw createError({ statusCode: 400, message: 'Formato de CURP invalido' })
  }

  const pool = await useDbPool(event)
  return await consultarCurp(pool, curp)
})
