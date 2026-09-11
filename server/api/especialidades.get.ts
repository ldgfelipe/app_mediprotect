export default defineEventHandler(async (event) => {
  try {
    const pool = await useDbPool(event)
    const result = await pool.query('SELECT * FROM especialidades ORDER BY nombre')
    return { especialidades: result.rows }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err?.message || 'Error interno del servidor' })
  }
})
